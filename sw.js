
const CACHE_NAME = 'tmjw-shell-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js',
  '/tmassets/icon-180x180.png', '/tmassets/icon-192.png', '/tmassets/icon-512.png',
  '/manifest.webmanifest'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(()=> self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(()=> self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(res => 
      res || fetch(e.request).then(net => {
        // Cache-pass-through for navigation + static
        const copy = net.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy)).catch(()=>{});
        return net;
      }).catch(()=> caches.match('/index.html'))
    )
  );
});
