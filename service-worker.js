const CACHE = 'medical-123-v16';
// Keep the ?v= query in sync with index.html so offline requests match the precache.
const ASSETS = ['./', './index.html', './style.css?v=16', './i18n.js?v=16', './app.js?v=16', './manifest.webmanifest', './icon.png'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.filter(name => name !== CACHE).map(name => caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if(response.ok && new URL(event.request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      return cached || caches.match('./index.html');
    }
  })());
});
