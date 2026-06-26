// Sea of Blue — PWA Service Worker
const CACHE_NAME = 'sob-enterprise-v2';

const STATIC_ASSETS = [
  '/contractor',
  '/manifest.json',
  '/logo.png',
  '/favicon.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
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
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
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
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => {
        // If fetch fails and no cache, and it's a navigation request, show a generic offline page or fallback to the app shell
        if (!cachedResponse && event.request.mode === 'navigate') {
          return caches.match('/contractor');
        }
      });
      return cachedResponse || fetchPromise;
    })
  );
});
