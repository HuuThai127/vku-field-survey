// VKU Field Survey - Service Worker
// Cache-First App Shell Strategy + Offline Support + Background Sync

const CACHE_NAME = 'vku-survey-shell-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png'
];

// Installation: Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching app shell assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Precache partial error (ignored for non-critical assets):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation: Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('vku-survey-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[ServiceWorker] Deleting obsolete cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache-First for static assets, network fallback + runtime caching
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip chrome-extension, capacitor-specific native scheme, or mock API if needed
  if (url.protocol === 'chrome-extension:' || url.protocol === 'capacitor:') {
    return;
  }

  // Handle navigation requests (SPA HTML entrypoint)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cachedIndex) => {
        return fetch(request)
          .then((networkResponse) => {
            // Update cache in background
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback to cached index.html
            return cachedIndex || caches.match('./');
          });
      })
    );
    return;
  }

  // Static assets & script/style requests: Cache-First strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached immediately; optionally revalidate in background
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {
          // Offline, cached version already returned
        });
        return cachedResponse;
      }

      // Not in cache, fetch from network and cache
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch((error) => {
        console.warn('[ServiceWorker] Fetch failed for:', request.url, error);
        // If image request fails offline, could return placeholder if needed
        return new Response('Network error occurred and no cached asset available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});

// Background Sync Event (SyncManager API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'vku-inspection-sync') {
    console.log('[ServiceWorker] Background sync event triggered: vku-inspection-sync');
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_BACKGROUND_SYNC' });
        });
      })
    );
  }
});

// Skip waiting message listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
