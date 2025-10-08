
const CACHE='tmjw-full-rel-v1';
const ASSETS=['./','index.html','styles.css','app.js','manifest.json','icons/icon-180x180.png','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET')return; e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });
