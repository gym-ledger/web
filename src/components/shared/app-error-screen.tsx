"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const AUTO_RELOAD_KEY = "apex:auto-reload-at";
const MANUAL_RELOAD_KEY = "apex:manual-reload-at";
const AUTO_RELOAD_COOLDOWN_MS = 60_000;
// The app's offline copies of API data (src/lib/offline/apiResponseCache.ts).
const API_CACHE_PREFIX = "apex-api-";

/**
 * A chunk that failed to load almost always means the app in memory is from
 * an older deploy than the server, and a full reload fixes it.
 */
function isStaleBuildError(error: Error) {
  return (
    error.name === "ChunkLoadError" ||
    /Loading (CSS )?chunk|dynamically imported module|Importing a module script failed/i.test(error.message)
  );
}

function readTime(key: string) {
  try {
    return Number(sessionStorage.getItem(key) ?? 0);
  } catch {
    return 0;
  }
}

function writeTime(key: string) {
  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Private mode etc.: only the loop protection is lost.
  }
}

/**
 * Drops the service worker's cached pages before reloading, so the reload
 * can't be answered with the same stale page again. Cached API data and the
 * offline write queue live elsewhere and are kept.
 */
async function hardReload() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("apex-sw-pages-")).map((key) => caches.delete(key)));
  } catch {
    // No Cache API (or blocked) — a plain reload is still the best we can do.
  }
  window.location.reload();
}

/**
 * The stronger fix, offered when a reload didn't help: removes the service
 * worker and every cached page, asset and saved API response, then reloads
 * from the server. Workouts and edits waiting to sync are kept (they live in
 * local storage, not these caches); only offline viewing of screens is lost
 * until they are opened again.
 */
async function resetAndReload() {
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((registrations ?? []).map((r) => r.unregister()));
  } catch {
    // Keep going: clearing the caches alone usually does it.
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("apex-sw-") || key.startsWith(API_CACHE_PREFIX)).map((key) => caches.delete(key)));
  } catch {
    // No Cache API.
  }
  window.location.reload();
}

/**
 * Recover on its own once; the cooldown stops a reload loop if the reload
 * doesn't fix it.
 */
function claimAutoReload(error: Error) {
  if (!isStaleBuildError(error)) return false;
  if (Date.now() - readTime(AUTO_RELOAD_KEY) < AUTO_RELOAD_COOLDOWN_MS) return false;
  writeTime(AUTO_RELOAD_KEY);
  return true;
}

export function AppErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry?: () => void }) {
  const [reloading, setReloading] = useState(() => claimAutoReload(error));
  // Back on this screen right after "Reload": a plain reload didn't fix it.
  const [reloadFailed] = useState(() => Date.now() - readTime(MANUAL_RELOAD_KEY) < AUTO_RELOAD_COOLDOWN_MS);

  useEffect(() => {
    // Shows up in the browser console for anyone reporting the problem.
    console.error("Screen failed to render:", error);
  }, [error]);

  useEffect(() => {
    if (reloading) void hardReload();
  }, [reloading]);

  const reload = () => {
    writeTime(MANUAL_RELOAD_KEY);
    setReloading(true);
  };

  const reset = () => {
    setReloading(true);
    void resetAndReload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="font-display text-[32px] leading-none font-bold">
          {reloading ? "Updating…" : "This screen didn’t load"}
        </h1>
        <p className="text-[15px] text-muted-foreground">
          {reloading
            ? "A newer version of the app is loading."
            : reloadFailed
              ? "Reloading didn’t fix it. Reset the app’s saved copies and try again, or go to Home. Workouts you logged offline are kept."
              : "Reload to get the latest version. Workouts you logged offline are kept."}
        </p>
      </div>
      {!reloading && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          {reloadFailed ? (
            <Button variant="light" size="xl" onClick={reset}>
              Reset and reload
            </Button>
          ) : (
            <Button variant="light" size="xl" onClick={reload}>
              Reload
            </Button>
          )}
          {retry && (
            <Button variant="outline" size="xl" onClick={retry}>
              Try again
            </Button>
          )}
          <Link href="/home" className="flex min-h-11 items-center justify-center text-[15px] font-semibold text-primary">
            Go to Home
          </Link>
        </div>
      )}
      <details className="max-w-xs text-left text-[13px] text-subtle">
        <summary className="cursor-pointer text-center">Technical details</summary>
        <p className="mt-2 break-words">
          {error.digest ? `Server error ${error.digest}` : `${error.name}: ${error.message}`.slice(0, 300)}
        </p>
      </details>
    </div>
  );
}
