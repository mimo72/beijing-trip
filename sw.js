/**
 * sw.js - Service Worker for 北京之旅 PWA
 *
 * Strategy:
 *   - Static assets (same-origin): Cache First, fallback to Network
 *   - External requests (cross-origin): Network Only
 *   - Activate: clean up old caches
 */

const CACHE_NAME = 'beijing-trip-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './features.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icons/icon.svg'
];

// ---- Install: pre-cache static assets ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: clean up old version caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Fetch: cache-first for same-origin, network-only for cross-origin ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Cross-origin requests: network only (don't cache third-party resources)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Don't cache non-ok responses
        if (!response || response.status !== 200) return response;

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // Offline fallback: if requesting a navigation (HTML page), serve cached index
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
