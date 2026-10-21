"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const AUTO_RELOAD_KEY = "apex:auto-reload-at";
const AUTO_RELOAD_COOLDOWN_MS = 60_000;

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
 * Recover on its own once; the cooldown stops a reload loop if the reload
 * doesn't fix it.
 */
function claimAutoReload(error: Error) {
  if (!isStaleBuildError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) ?? 0);
    if (Date.now() - last < AUTO_RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function AppErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry?: () => void }) {
  const [reloading, setReloading] = useState(() => claimAutoReload(error));

  useEffect(() => {
    if (reloading) void hardReload();
  }, [reloading]);

  const reload = () => setReloading(true);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="font-display text-[32px] leading-none font-bold">
          {reloading ? "Updating…" : "This screen didn’t load"}
        </h1>
        <p className="text-[15px] text-muted-foreground">
          {reloading
            ? "A newer version of the app is loading."
            : "Reload to get the latest version. Workouts you logged offline are kept."}
        </p>
      </div>
      {!reloading && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button variant="light" size="xl" onClick={reload}>
            Reload
          </Button>
          {retry && (
            <Button variant="outline" size="xl" onClick={retry}>
              Try again
            </Button>
          )}
        </div>
      )}
      {error.digest && <p className="text-[13px] text-subtle">Error {error.digest}</p>}
    </div>
  );
}
