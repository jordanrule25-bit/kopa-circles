// Kopa Circles service worker: keeps agent screens usable without signal.
// Static assets: cache first. Pages: network first, falling back to the last
// copy seen, then to /offline. Never caches POSTs (server actions) or sign-in.
const STATIC = "kopa-static-v2";
const PAGES = "kopa-pages-v2";
// Plain HTML with no app code, so it renders at any address while offline.
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") {
    event.waitUntil(caches.delete(PAGES).then(() => caches.open(PAGES)).then((c) => c.add(OFFLINE)));
  }
});

const cacheablePage = (url) =>
  url.pathname === "/" || url.pathname === "/agent" || url.pathname.startsWith("/agent/") || url.pathname.startsWith("/circles/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/app-icon/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req, { ignoreVary: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) event.waitUntil(cache.put(req, res.clone()));
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && cacheablePage(url)) {
            // Copy before the browser reads the body; keep the worker alive until it's stored.
            const copy = res.clone();
            const stored = caches
              .open(PAGES)
              .then((c) => c.put(req, copy))
              .catch(() => {}); // a full disk shouldn't break browsing
            try {
              event.waitUntil(stored);
            } catch {
              // Some browsers refuse late waitUntil calls; the write still runs.
            }
          }
          return res;
        } catch {
          // Next.js marks pages Vary: RSC etc.; a full-page navigation should still match.
          return (await caches.match(req, { ignoreVary: true })) || (await caches.match(OFFLINE, { ignoreVary: true })) || Response.error();
        }
      })(),
    );
  }
});
