// Import service worker config
importScripts('sw-config.js');

// Version-based cache name
const CACHE_VERSION = self.APP_CONFIG.VERSION;
const CACHE_NAME = `yoyodex-cache-v${CACHE_VERSION}`;

// Assets to cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './config.js',
  './sw-config.js',
  './manifest.json',
  './assets/g2-logo.png',
  './assets/placeholder.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Install event - cache assets and skip waiting
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
  
  // Cache assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache each asset individually to handle failures gracefully
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Failed to cache ${url}:`, error);
            })
          )
        );
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  // Claim clients to ensure the new service worker controls all pages
  event.waitUntil(clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response because it can only be used once
        const responseToCache = response.clone();

        // Update cache in the background
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache)
              .catch(error => {
                console.warn('Failed to update cache:', error);
              });
          });

        return response;
      })
      .catch(() => {
        // If network request fails, try to serve from cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If not in cache, return a fallback response
            return new Response('Network error occurred', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
}); 