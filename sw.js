// Ao publicar uma versão nova dos arquivos, aumente o número abaixo (v2, v3...).
const CACHE = "diario-treino-v1";
const FONTS = "diario-treino-fontes";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function fromCacheThenUpdate(event, cacheName) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: cacheName === CACHE });
  const network = fetch(req).then(res => {
    if (res && (res.ok || res.type === "opaque")) {
      const copy = res.clone();
      cache.put(req, copy).catch(() => {});
    }
    return res;
  }).catch(() => null);
  event.waitUntil(network.then(() => {}));
  if (cached) return cached;
  const res = await network;
  if (res) return res;
  if (req.mode === "navigate") {
    const shell = await cache.match("./index.html");
    if (shell) return shell;
  }
  return Response.error();
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(fromCacheThenUpdate(event, CACHE));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(fromCacheThenUpdate(event, FONTS));
  }
});
