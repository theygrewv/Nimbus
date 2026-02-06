const CACHE_NAME = 'bluetune-v2-cache';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
