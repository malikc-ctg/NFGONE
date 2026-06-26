'use client';

import { toast } from 'sonner';

/**
 * Sea of Blue — Offline Queue (IndexedDB)
 * 
 * Queues API mutations (POST, PATCH, DELETE) when the device is offline,
 * and replays them automatically when the connection returns.
 */

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'sob-offline-sync';
const STORE_NAME = 'requests';

export class OfflineQueue {
  private db: IDBDatabase | null = null;
  private isReplaying = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
      window.addEventListener('online', () => this.replayQueue());
    }
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async enqueueRequest(url: string, method: string, headers: Record<string, string>, body: string | null): Promise<void> {
    if (!this.db) await this.initDB();

    const req: QueuedRequest = {
      id: crypto.randomUUID(),
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(req);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getQueue(): Promise<QueuedRequest[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Sort by timestamp so older requests are replayed first
        const sorted = (request.result as QueuedRequest[]).sort((a, b) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async replayQueue(): Promise<void> {
    if (this.isReplaying) return;
    this.isReplaying = true;

    try {
      const requests = await this.getQueue();
      if (requests.length === 0) return;

      toast.info(`Syncing ${requests.length} offline actions...`);
      let successCount = 0;

      for (const req of requests) {
        try {
          const response = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body,
          });

          if (response.ok || response.status >= 400) {
            // Remove on success, or if it's a client/server error that isn't a network failure
            await this.removeFromQueue(req.id);
            if (response.ok) successCount++;
          }
        } catch (err) {
          // Network error - keep in queue
          console.error('Failed to sync offline request', req.url, err);
        }
      }

      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline actions successfully!`);
        // Notify app to refresh data
        window.dispatchEvent(new Event('offline-sync-complete'));
      }
    } finally {
      this.isReplaying = false;
    }
  }
}

export const offlineQueue = new OfflineQueue();

/**
 * A fetch wrapper that queues mutating requests if offline.
 * Drop-in replacement for standard fetch().
 */
export async function smartFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (typeof window !== 'undefined' && !navigator.onLine && isMutation) {
    // We are offline and making a mutation request
    
    // Convert headers to Record<string, string>
    const headers: Record<string, string> = {};
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => { headers[key] = value; });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => { headers[key] = value; });
      } else {
        Object.entries(options.headers).forEach(([key, value]) => { headers[key] = value; });
      }
    }
    
    // Add custom header to identify queued requests on the backend if needed
    headers['X-Offline-Queued'] = 'true';

    await offlineQueue.enqueueRequest(
      url,
      method,
      headers,
      options.body ? String(options.body) : null
    );

    toast('Action saved offline. Will sync when connection returns.', {
      icon: '📡',
      duration: 3000,
    });

    // Return a fake successful response so the UI optimistically updates
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      statusText: 'Accepted (Offline)',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Normal fetch
  return fetch(url, options);
}
