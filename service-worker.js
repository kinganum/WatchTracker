const CACHE_NAME = 'watchtracker-cache-v2';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/index.tsx'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(APP_SHELL_URLS);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For Supabase API calls, we want network only.
  // The application logic will handle the IndexedDB fallback.
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-while-revalidate for all other assets (app shell, scripts, styles)
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Don't cache failed requests or non-OK responses that are not opaque
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
              cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
            // This will be called when the network is down
            console.warn('Fetch failed; returning cached response instead.', err);
            return response; // Return the cached response if fetch fails
        });
        // Return cached response immediately if available, and fetch update in background.
        return response || fetchPromise;
      });
    })
  );
});