const BUILD_ID = 'dev';
const CACHE_NAME = `convera-cache-${BUILD_ID}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/logo.png',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/apple-touch-icon.png'
];

async function getAssetsToPrecache() {
  const assets = new Set(STATIC_ASSETS);
  const res = await fetch('/asset-manifest.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch asset manifest: HTTP ${res.status}`);
  }
  const manifest = await res.json();
  if (!manifest || manifest.buildId !== BUILD_ID || !Array.isArray(manifest.assets)) {
    throw new Error('Invalid asset manifest: buildId mismatch or missing assets array');
  }
  manifest.assets.forEach((asset) => assets.add(asset));
  return Array.from(assets);
}

// Install: pre-cache static assets and production bundles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        const assets = await getAssetsToPrecache();
        return cache.addAll(assets);
      })
      .catch((err) => {
        console.warn('[PWA SW] Pre-cache failed:', err);
        throw err;
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy for navigation & assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass caching for non-GET and third-party backend APIs (Firebase, Google APIs)
  if (
    request.method !== 'GET' ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com')
  ) {
    return;
  }

  // Navigation requests: Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Static Assets (scripts, styles, fonts, images): Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (stale-while-revalidate)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return networkResponse;
      });
    })
  );
});
