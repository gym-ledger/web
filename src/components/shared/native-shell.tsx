"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeBuild } from "@/lib/platform";
import { exitApp, onBackButton, openExternal } from "@/lib/platform/native";

// The bottom-nav tabs. Back on Home leaves the app; back on another tab with
// no history goes to Home.
const HOME_PATH = "/home/";

/**
 * Whether there's an earlier in-app page to go back to. The WebView's own
 * canGoBack (what Capacitor reports) misses Next's client-side navigations;
 * the Navigation API knows the real position. Falls back to Capacitor's answer
 * where the Navigation API is missing.
 */
function hasHistoryBehind(capacitorCanGoBack: boolean): boolean {
  const index = (window as { navigation?: { currentEntry?: { index: number } | null } }).navigation?.currentEntry?.index;
  return typeof index === "number" ? index > 0 : capacitorCanGoBack;
}

/**
 * The top open dialog or sheet: a Radix dialog / vaul drawer (they carry
 * data-state), or one of the app's own framer-motion sheets (role="dialog",
 * no data-state).
 */
function openDialog(): HTMLElement | null {
  const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')].filter(
    (el) => el.dataset.state !== "closed" && el.getClientRects().length > 0,
  );
  return dialogs.length ? dialogs[dialogs.length - 1] : null;
}

/** Closes it the way a user would: Escape for Radix, else its Close button, else its backdrop. */
function closeDialog(dialog: HTMLElement) {
  if (dialog.dataset.state) {
    // Radix (and so vaul) closes on Escape from inside the dialog.
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
    return;
  }
  const closeButton = dialog.querySelector<HTMLElement>('button[aria-label="Close"]');
  if (closeButton) closeButton.click();
  // The app's sheets close when their backdrop (the dialog's parent) is tapped.
  else dialog.parentElement?.click();
}

/**
 * Native app behaviour that belongs to no single screen. Renders nothing,
 * and does nothing in the web build.
 */
export function NativeShell() {
  const router = useRouter();

  // Android back button: close the top sheet/dialog first, then go back in
  // the app's history, and leave the app from Home.
  useEffect(() => {
    if (!isNativeBuild) return;
    return onBackButton((canGoBack) => {
      const dialog = openDialog();
      if (dialog) {
        closeDialog(dialog);
        return;
      }
      const path = window.location.pathname.endsWith("/") ? window.location.pathname : `${window.location.pathname}/`;
      if (path === HOME_PATH || path === "/login/") {
        void exitApp();
      } else if (hasHistoryBehind(canGoBack)) {
        router.back();
      } else {
        router.replace(HOME_PATH);
      }
    });
  }, [router]);

  // Links to other sites open in the system browser; the WebView itself never
  // navigates away from the app.
  useEffect(() => {
    if (!isNativeBuild) return;
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href, window.location.href);
      if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== window.location.origin) {
        event.preventDefault();
        void openExternal(url.toString());
      }
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
