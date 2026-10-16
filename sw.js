// Keep each GitHub Pages project's offline cache separate.
const CACHE_PREFIX = `tetris-${encodeURIComponent(self.registration.scope)}-`;
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const ASSETS = [
  "./", "./index.html", "./style.css", "./app.js", "./manifest.json",
  "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Bypass the HTTP cache when replacing a previously published game.
    await cache.addAll(ASSETS.map((path) => new Request(
      new URL(path, self.registration.scope), { cache: "reload" },
    )));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" ||
      !event.request.url.startsWith(self.registration.scope)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // Prefer the published version; offline storage must not pin an old game.
      const response = await fetch(event.request, { cache: "no-cache" });
      if (response.ok && response.type === "basic") {
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        const home = await cache.match(new URL("./", self.registration.scope).href);
        if (home) return home;
      }
      throw error;
    }
  })());
});
