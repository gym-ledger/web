"use client";

import { useState } from "react";
import { Download, Share } from "lucide-react";
import { isIosSafari, promptInstall, useInstallStore } from "@/lib/pwa/install";

/**
 * "Install APEX" in Profile. Uses the browser's install prompt where there is
 * one (Chrome/Edge/Samsung on Android and desktop), shows the Share → Add to
 * Home Screen steps on iOS Safari, and hides itself once running as the
 * installed app or where installing isn't possible.
 */
export function InstallAppCard() {
  const promptEvent = useInstallStore((s) => s.promptEvent);
  const isStandalone = useInstallStore((s) => s.isStandalone);
  // Never server-rendered: the (main) layout renders nothing until the
  // client-side auth store has loaded, so the user agent is always available.
  const [ios] = useState(() => typeof navigator !== "undefined" && isIosSafari());

  if (isStandalone) return null;

  if (promptEvent) {
    return (
      <button
        type="button"
        onClick={() => promptInstall()}
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-input"
      >
        <div>
          <p className="text-[15px] font-semibold">Install APEX</p>
          <p className="text-[13px] text-muted-foreground">Opens full-screen from your home screen and works offline.</p>
        </div>
        <Download className="size-4 shrink-0 text-primary" />
      </button>
    );
  }

  if (ios) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
        <div>
          <p className="text-[15px] font-semibold">Install APEX</p>
          <p className="text-[13px] text-muted-foreground">
            Tap <Share className="inline size-3.5 align-[-2px]" aria-label="Share" /> Share, then &ldquo;Add to Home
            Screen&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
