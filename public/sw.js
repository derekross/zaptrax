const APP_VERSION = '0.9.0'; // This will be replaced during build
const CACHE_NAME = `zaptrax-v${APP_VERSION}`;
const STATIC_CACHE_NAME = `zaptrax-static-v${APP_VERSION}`;

const staticAssets = [
  '/manifest.webmanifest',
  '/zaptrax.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static resources and force immediate activation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(staticAssets);
      })
      .then(() => {
        // Skip waiting to activate new service worker immediately
        return self.skipWaiting();
      })
  );
});

// Fetch event - network first strategy for app files, cache first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip service worker for RSS feeds and CORS proxies - let browser handle directly
  if (url.hostname === 'corsproxy.io' ||
      url.hostname === 'api.allorigins.win' ||
      (url.hostname === 'wavlake.com' && url.pathname.includes('/feed/'))) {
    return; // Don't intercept - let browser fetch directly
  }

  // For same-origin requests (app files)
  if (url.origin === location.origin) {
    // Static assets (images, manifest) - cache first
    if (staticAssets.some(asset => url.pathname.endsWith(asset))) {
      event.respondWith(
        caches.match(request)
          .then((response) => response || fetch(request))
      );
      return;
    }

    // App files (HTML, JS, CSS) - network first for fresh content
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();

          // Only cache successful responses
          if (response.status === 200) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }

          return response;
        })
        .catch(() => {
          // Fallback to cache when network fails
          return caches.match(request);
        })
    );
  } else {
    // External resources - network only (don't cache external APIs)
    event.respondWith(fetch(request));
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all caches that don't match current version
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all tabs immediately
      return self.clients.claim();
    })
  );
});