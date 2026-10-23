// Learner Lens service worker: the app opens instantly and works offline.
// Data (/api) always goes to the network, so nothing stale is ever shown as saved.
const VERSION = "2c877aec025a";
const SHELL = `ll-shell-${VERSION}`;
const FONTS = "ll-fonts-v1";
const SHELL_FILES = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-32.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ll-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return; // live data only

  // Google Fonts: serve from cache, refresh in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // The page: network first so updates show up, cached copy when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((r) => { caches.open(SHELL).then((c) => c.put("/", r.clone())); return r; })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Icons and manifest: cache first.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
