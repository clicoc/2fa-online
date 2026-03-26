const CACHE_NAME = 'bulk-2fa-v1';
const ASSETS = [
  '/bulk-otp',
  'https://cdn.jsdelivr.net/npm/otpauth@9.1.4/dist/otpauth.umd.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
