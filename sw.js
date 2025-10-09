
// TimeMate SW – offline PWA + zuverlässige Updates
const CACHE_VERSION = 'tmjw-v10';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css?v=10',
  './app.js?v=10',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE_VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isCore = req.mode === 'navigate' || req.destination==='document' || req.destination==='script' || req.destination==='style';
  event.respondWith(isCore ? networkFirst(req) : cacheFirst(req));
});

async function networkFirst(req){
  try{
    const res = await fetch(req, { cache:'no-store' });
    const cache = await caches.open(CACHE_VERSION);
    cache.put(req, res.clone());
    return res;
  }catch(e){
    const cached = await caches.match(req);
    return cached || caches.match('./index.html');
  }
}
async function cacheFirst(req){
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  const cache = await caches.open(CACHE_VERSION);
  cache.put(req, res.clone());
  return res;
}
