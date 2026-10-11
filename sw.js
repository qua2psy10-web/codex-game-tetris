// Migration worker: stop serving the former cache-first Tetris index at root.
// Archived Tetris has its own scoped worker under /tetris/.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await caches.delete('tetris-v1');
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
