// APEX service worker — offline + slow-network support, hand-written.
//
// Not Workbox/Serwist: their Next integrations need a webpack build plugin,
// and this app builds with Turbopack. Strategy:
//
//  - /_next/static/* (content-hashed, immutable): cache-first. A file with a
//    given name never changes, so the cached copy is always correct and
//    loads instantly on a weak gym connection.
//  - Pages and Next's RSC payloads: network-first, but if the network hasn't
//    answered within NETWORK_TIMEOUT_MS and a cached copy exists, serve that
//    (the network response still lands in the cache when it arrives). Offline
//    with nothing cached for that URL, a navigation gets /offline.html.
//  - On install, the main tabs are precached along with every static asset
//    their HTML references, so a freshly installed app opens offline.
//
// API requests are cross-origin and never touched here — the app keeps its
// own offline copies of API data (src/lib/offline/apiResponseCache.ts, cache
// "apex-api-v1", which this worker must not delete) and queues writes.

const STATIC_CACHE = "apex-sw-static";
const PAGES_CACHE = "apex-sw-pages-v2";
const OWN_CACHES = [STATIC_CACHE, PAGES_CACHE];
// Caches from earlier versions of this worker.
const LEGACY_CACHES = ["apex-runtime-v1"];

const OFFLINE_URL = "/offline.html";
const PRECACHE_PAGES = [
  "/home",
  "/workout",
  "/workout/active",
  "/workout/history",
  "/progress",
  "/exercises",
  "/profile",
  "/login",
];
const NETWORK_TIMEOUT_MS = 3000;
const MAX_PAGES_ENTRIES = 80;
const MAX_STATIC_ENTRIES = 400;

const STATIC_ASSET_PATTERN = /\/_next\/static\/[^"'\s)<>\\]+/g;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Keys come back in insertion order — drop the oldest.
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)));
}

/** Caches a page plus the /_next/static assets its HTML references. */
async function precachePage(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok || response.redirected) return;
  const html = await response.clone().text();
  await (await caches.open(PAGES_CACHE)).put(url, response);
  const assets = [...new Set(html.match(STATIC_ASSET_PATTERN) ?? [])];
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all(
    assets.map(async (asset) => {
      try {
        if (await staticCache.match(asset)) return;
        const res = await fetch(asset);
        if (res.ok) await staticCache.put(asset, res);
      } catch {
        // One missed asset just gets cached on first use instead.
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      // The offline page is what makes an unvisited screen fail gracefully.
      await caches
        .open(PAGES_CACHE)
        .then((cache) => cache.add(OFFLINE_URL))
        .catch(() => {});
      // Best-effort: installing on a weak connection must not fail the
      // worker — anything missed here is cached as it gets visited.
      await Promise.all(PRECACHE_PAGES.map((url) => precachePage(url).catch(() => {})));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              LEGACY_CACHES.includes(key) || (key.startsWith("apex-sw-") && !OWN_CACHES.includes(key)),
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES).catch(() => {});
  }
  return response;
}

async function networkFirst(event) {
  const { request } = event;
  const cache = await caches.open(PAGES_CACHE);

  const network = fetch(request).then((response) => {
    // A redirected response can't be replayed for a navigation (the browser
    // rejects it), so only plain successful responses are cached.
    if (response.ok && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(
        cache
          .put(request, copy)
          .then(() => trimCache(PAGES_CACHE, MAX_PAGES_ENTRIES))
          .catch(() => {}),
      );
    }
    return response;
  });
  // Keep the cache update alive even if the timeout below wins the race.
  event.waitUntil(network.catch(() => {}));

  const cached = await cache.match(request);
  if (cached) {
    const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
    return Promise.race([network.catch(() => cached), timeout]);
  }

  try {
    return await network;
  } catch {
    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(event));
});
