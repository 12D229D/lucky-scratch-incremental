const CACHE_NAME = 'lucky-scratch-incremental-v1.0.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/style.css',
  './src/main.js',
  './src/store.js',
  './src/scratch/scratchCanvas.js',
  './src/scratch/particles.js',
  './src/economy/bigNumber.js',
  './src/economy/upgrades.js',
  './src/economy/prestige.js',
  './src/economy/offline.js',
  './src/storage/save.js',
  './src/data/cards.json',
  './schema.sql',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Fallback offline básico
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
