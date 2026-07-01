const CACHE_NAME = 'quicksos-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/src/data/national.json',
  '/src/data-loader.js'
];

const STATE_FILES = [
  '/src/data/states/kelantan.json',
  '/src/data/states/kuala-lumpur.json',
  '/src/data/states/selangor.json',
  '/src/data/states/kedah.json',
  '/src/data/states/johor.json',
  '/src/data/states/terengganu.json',
  '/src/data/states/pahang.json',
  '/src/data/states/penang.json',
  '/src/data/states/perak.json',
  '/src/data/states/negeri-sembilan.json',
  '/src/data/states/melaka.json',
  '/src/data/states/sabah.json',
  '/src/data/states/sarawak.json',
  '/src/data/states/perlis.json',
  '/src/data/states/putrajaya.json',
  '/src/data/states/labuan.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([...ASSETS, ...STATE_FILES]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
