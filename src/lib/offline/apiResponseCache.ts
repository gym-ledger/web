/**
 * Last-known-good copies of API GET responses, so the app keeps working
 * offline: the API client stores every successful GET here and falls back to
 * it when the network fails (see `request` in api-client.ts).
 *
 * Uses Cache Storage (larger quota than localStorage, async, available in
 * every browser that can install the app). The cache is per-user data, so it
 * is wiped on logout. The service worker only manages its own `apex-sw-*`
 * caches and leaves this one alone.
 */

const CACHE_NAME = "apex-api-v1";
// Cache Storage keys must be URLs; these never hit the network.
const KEY_PREFIX = "/__api-cache__";

// Bumped on every clear. A GET still in flight across a logout carries the
// old generation, so its late write is dropped instead of leaking that
// user's data into the next session.
let generation = 0;

export function currentCacheGeneration() {
  return generation;
}

function isAvailable() {
  return typeof window !== "undefined" && "caches" in window;
}

function keyFor(path: string) {
  return new Request(`${window.location.origin}${KEY_PREFIX}${path}`);
}

/**
 * Stores `data` as the latest response for `path`. Pass the generation read
 * when the request started (`currentCacheGeneration()`). Best-effort — never throws.
 */
export async function writeCachedApiResponse(
  path: string,
  data: unknown,
  requestGeneration = generation,
): Promise<void> {
  if (!isAvailable() || requestGeneration !== generation) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    if (requestGeneration !== generation) return;
    await cache.put(
      keyFor(path),
      new Response(JSON.stringify({ data: data ?? null }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch {
    // Quota exceeded / storage blocked (private mode) — just no offline copy.
  }
}

/** The stored response for `path`, or `{ found: false }`. Never throws. */
export async function readCachedApiResponse<T>(path: string): Promise<{ found: true; data: T } | { found: false }> {
  if (!isAvailable()) return { found: false };
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(keyFor(path));
    if (!res) return { found: false };
    const body = (await res.json()) as { data: T };
    return { found: true, data: body.data };
  } catch {
    return { found: false };
  }
}

/** Drops every stored response — on logout, so the next user never sees them. */
export async function clearApiResponseCache(): Promise<void> {
  generation++;
  if (!isAvailable()) return;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    // Nothing to clear / storage blocked.
  }
}
