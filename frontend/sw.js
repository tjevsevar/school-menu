// Simplified Service Worker for PWA functionality
const CACHE_NAME = 'school-lunch-v6';
const urlsToCache = [
  '/manifest.json',
  '/school-logo.png'
];

// Install event - cache basic resources only
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching basic resources');
        return cache.addAll(urlsToCache).catch((error) => {
          console.log('Cache addAll failed:', error);
          // Don't fail installation if caching fails
          return Promise.resolve();
        });
      })
  );
  // Skip waiting and activate immediately
  self.skipWaiting();
});

// Fetch event - simplified caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle requests to our own domain
  if (url.origin !== location.origin) {
    return;
  }
  
  // Don't cache API requests - always fetch fresh
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch((error) => {
        console.log('API fetch failed:', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Network error: Unable to connect to server'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Always go to the network for HTML so updates reach pinned users.
  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');
  if (event.request.mode === 'navigate' || acceptsHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch((error) => {
        console.log('Fetch failed:', error);
        return new Response('<h1>Offline</h1><p>Please check your internet connection.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).catch((error) => {
          console.log('Fetch failed:', error);
          // Return a basic offline response for HTML requests
          if (event.request.headers.get('accept').includes('text/html')) {
            return new Response('<h1>Offline</h1><p>Please check your internet connection.</p>', {
              headers: { 'Content-Type': 'text/html' }
            });
          }
          throw error;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  return self.clients.claim().then(() => {
    return self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.navigate(client.url);
      });
    });
  });
});
