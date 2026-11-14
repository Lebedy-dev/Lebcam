// Service worker: после первой загрузки приложение (и MediaPipe с CDN) работает без сети.
const CACHE = 'swan-cam-v1';   // при изменении index.html можно поднять версию

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['./', './index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Кэш сначала, параллельно обновляем из сети (stale-while-revalidate)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          // сохраняем успешные ответы, включая кросс-доменные (CDN, модель)
          if (res && res.status !== 206 && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
      return hit || net;
    })
  );
});
