const CACHE_NAME = '2fa-auth-v1';
// 注意：如果你有 /bulk 页面，也建议写在这里
const ASSETS = [
  '/',
  '/bulk'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
