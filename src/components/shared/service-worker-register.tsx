"use client";

import { useEffect } from "react";
import { isNativeBuild } from "@/lib/platform/build";
import { initInstallPrompt, useInstallStore } from "@/lib/pwa/install";

/**
 * Registers the offline service worker (public/sw.js) and starts listening
 * for the browser's install prompt (offered from Profile). The worker is
 * production only — caching dev-mode assets would fight Turbopack's fast
 * refresh and serve stale code while iterating locally.
 *
 * The native app does neither: its pages already ship inside the app, service
 * workers are unreliable on the webview's local origin (iOS especially), and
 * an installed app has nothing to install.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (isNativeBuild) {
      useInstallStore.setState({ isStandalone: true });
      return;
    }
    const stopInstallPrompt = initInstallPrompt();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      // The deployment id in the URL makes each deploy a new worker script, so
      // it installs, re-precaches the pages from this build and drops the old
      // pages cache. sw.js itself is the same file every deploy, so without
      // it the browser would keep the old worker and its stale pages forever.
      // `updateViaCache: "none"` — always fetch sw.js itself fresh.
      const version = encodeURIComponent(process.env.NEXT_PUBLIC_DEPLOYMENT_ID ?? "dev");
      navigator.serviceWorker.register(`/sw.js?v=${version}`, { updateViaCache: "none" }).catch(() => {});
    }
    return stopInstallPrompt;
  }, []);

  return null;
}
