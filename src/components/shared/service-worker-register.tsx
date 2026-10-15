"use client";

import { useEffect } from "react";
import { initInstallPrompt } from "@/lib/pwa/install";

/**
 * Registers the offline service worker (public/sw.js) and starts listening
 * for the browser's install prompt (offered from Profile). The worker is
 * production only — caching dev-mode assets would fight Turbopack's fast
 * refresh and serve stale code while iterating locally.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    const stopInstallPrompt = initInstallPrompt();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      // `updateViaCache: "none"` — always fetch sw.js itself fresh, so a new
      // deploy's worker is picked up on the next visit.
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }
    return stopInstallPrompt;
  }, []);

  return null;
}
