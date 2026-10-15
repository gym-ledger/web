"use client";

import { useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Shown while the device is offline — screens are running on saved data. */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-1.5 bg-warning-surface px-4 py-1.5 text-[13px] font-semibold text-warning"
    >
      <CloudOff className="size-3.5 shrink-0" />
      Offline — showing saved data. Sets you log sync when you&apos;re back online.
    </div>
  );
}
