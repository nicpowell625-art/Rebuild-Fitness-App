// Bump CACHE whenever index.html changes, or phones keep the old version.
const CACHE='rebuild-v11';
const IMG='rebuild-img-v1'; // exercise demo frames; survives app-shell bumps
const FILES=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==IMG).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // Exercise images: cache-first, so a session seen once shows its demos offline.
  if(url.hostname==='cdn.jsdelivr.net'||url.hostname==='raw.githubusercontent.com'){
    e.respondWith(caches.open(IMG).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(x=>{if(x.ok)c.put(e.request,x.clone());return x}))));
    return;
  }
  if(url.origin!==self.location.origin)return;
  // App shell: network first so fixes arrive; cache is the offline fallback.
  // On a weak signal don't hang on the network: after 3 s serve the cache and let the fetch finish in the background.
  const net=fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c))}return r});
  const cached=()=>caches.match(e.request).then(r=>r||caches.match('./index.html'));
  const slow=new Promise((_,rej)=>setTimeout(rej,3000));
  e.respondWith(Promise.race([net,slow]).catch(()=>cached().then(r=>r||net)));
  e.waitUntil(net.catch(()=>{}));
});
