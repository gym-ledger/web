// Minimal runtime-caching service worker.
//
// Deliberately NOT a build-time precache manifest (Workbox injectManifest /
// next-pwa style) — Next's hashed JS/CSS chunk filenames change every build
// and this repo's bundler (Turbopack) isn't a guaranteed-compatible target
// for those webpack-plugin-based tools. Instead: cache same-origin GET
// responses opportunistically as they're fetched, and serve from that cache
// when the network fails. This doesn't give a fully offline cold start on
// a device that has never opened the app, but it does mean pages/assets
// already visited keep working if connectivity drops mid-session or the app
// is reopened offline — the realistic "at the gym, spotty signal" case this
// app cares about (see SLOW_NETWORK_PWA_AUDIT.md).
//
// API requests are explicitly left alone — those are cross-origin (a
// different host/port than the app itself) and their offline resilience is
// handled by the app's own offline queues (workoutSetQueue /
// workoutSetUpdateQueue), not generic response caching, since API responses
// are dynamic/per-user and shouldn't be served stale.

const CACHE_NAME = "apex-runtime-v1";
const NAVIGATION_FALLBACK_URL = "/login";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Best-effort — a fresh install with no connectivity yet just skips this,
  // and the cache fills in as pages are actually visited.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(NAVIGATION_FALLBACK_URL))
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const fallback = await caches.match(NAVIGATION_FALLBACK_URL);
          if (fallback) return fallback;
        }
        return Response.error();
      }),
  );
});
