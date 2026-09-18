// Sea of Blue — PWA Service Worker
const CACHE_NAME = 'sob-enterprise-v2';

const STATIC_ASSETS = [
  '/employee',
  '/manifest.json',
  '/logo.png',
  '/favicon.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          fetch(asset).then((res) => {
            if (res.ok) return cache.put(asset, res);
          }).catch((err) => console.warn(`[SW] Failed to cache ${asset}:`, err))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      }),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: Network first, fallback to offline response
  if (url.pathname.startsWith('/api/')) {
    // Only cache GET requests
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && !response.bodyUsed) {
              try {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
              } catch (e) {
                // Ignore clone errors
              }
            }
            return response;
          })
          .catch(async () => {
            const cached = await caches.match(event.request);
            if (cached) return cached;
            
            // Generic offline API response
            return new Response(
              JSON.stringify({ error: 'You are currently offline. Showing cached data where available.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          })
      );
      return;
    }

    // POST/PATCH mutations will fail if offline. The offline-queue handles this client-side.
    return;
  }

  // Next.js static assets and other resources: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && !networkResponse.bodyUsed) {
          try {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            }).catch(() => {});
          } catch (e) {
            // Ignore clone errors
          }
        }
        return networkResponse;
      }).catch(() => {
        // If fetch fails and no cache, and it's a navigation request, show a generic offline page or fallback to the app shell
        if (!cachedResponse && event.request.mode === 'navigate') {
          return caches.match('/employee');
        }
      });
      return cachedResponse || fetchPromise;
    })
  );
});

// ======== WEB PUSH NOTIFICATIONS ========

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'Sea of Blue',
      body: event.data.text(),
      icon: '/favicon.png',
    };
  }

  const { title, body, icon, badge, data, tag } = payload;

  const options = {
    body: body || 'You have a new notification',
    icon: icon || '/favicon.png',
    badge: badge || '/favicon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: tag || 'sob-notification',
    renotify: true,
    requireInteraction: true,
    data: data || {},
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title || 'Sea of Blue', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/employee';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if found
      for (const client of windowClients) {
        if (client.url.includes('/employee') && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(urlToOpen);
    })
  );
});
