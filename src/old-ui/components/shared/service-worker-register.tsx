"use client";

import { useEffect } from "react";

/**
 * Registers the runtime-caching service worker (public/sw.js). Production
 * only — a service worker caching dev-mode assets would fight Turbopack's
 * fast refresh and serve stale code while iterating locally.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
