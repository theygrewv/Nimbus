// Updated Cache Version to force Pixel to update
const CACHE_NAME = 'bluetune-studio-v4';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

// Install: Cache all essential assets
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force the new service worker to take over immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
});

// Fetch: Serve from cache, fallback to network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
