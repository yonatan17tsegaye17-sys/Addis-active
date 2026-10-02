const CACHE_NAME = 'addis-active-v2';
const ASSETS = ['./', './index.html', './style.css', './app.js', './data/db.js', './data/extra.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const CDN = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(async c => {
    await c.addAll(ASSETS);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Stale-while-revalidate for app files, fonts and Leaflet; map tiles and other hosts go straight to network.
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const ok = url.origin === location.origin || CDN.includes(req.url) || /fonts\.(googleapis|gstatic)\.com$/.test(url.host);
  if (!ok) return;
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    return hit || net;
  }));
});

