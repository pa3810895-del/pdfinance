const CACHE_NAME = 'pdfinance-v1';
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(['/', '/index.html']).catch(() => {})).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {if (r && r.status === 200) {const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c));} return r;}).catch(() => caches.match(e.request).then(r => r || new Response('Offline', {status: 503}))));
});
