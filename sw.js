
// Network-first SW to avoid white-screen due to stale cached app.js
const CACHE = 'tmjw-netfirst-v100';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Only handle same-origin GET
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const net = await fetch(req, { cache: 'no-store' });
      // Optionally update a small runtime cache (not required)
      try {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      } catch {}
      return net;
    } catch {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      return cached || fetch(req);
    }
  })());
});
