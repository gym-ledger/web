"use client";

import { create } from "zustand";

/** Chromium's install prompt event — not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallState {
  /** Held from `beforeinstallprompt` so the app can show the prompt from its own button. */
  promptEvent: BeforeInstallPromptEvent | null;
  /** Running as the installed app (home-screen / standalone window). */
  isStandalone: boolean;
}

export const useInstallStore = create<InstallState>(() => ({
  promptEvent: null,
  isStandalone: false,
}));

function detectStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own flag for home-screen apps.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Starts listening for install availability. Call once, as early as
 * possible (the browser fires `beforeinstallprompt` once, near page load,
 * and a listener added later misses it). Returns a cleanup function.
 */
export function initInstallPrompt(): () => void {
  useInstallStore.setState({ isStandalone: detectStandalone() });

  function handlePrompt(event: Event) {
    // Keep the browser's mini-infobar from showing; we offer it in Profile.
    event.preventDefault();
    useInstallStore.setState({ promptEvent: event as BeforeInstallPromptEvent });
  }
  function handleInstalled() {
    useInstallStore.setState({ promptEvent: null, isStandalone: true });
  }

  window.addEventListener("beforeinstallprompt", handlePrompt);
  window.addEventListener("appinstalled", handleInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", handlePrompt);
    window.removeEventListener("appinstalled", handleInstalled);
  };
}

/** Shows the browser's install dialog. Resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = useInstallStore.getState().promptEvent;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // A prompt event can only be used once.
  useInstallStore.setState({ promptEvent: null });
  return outcome === "accepted";
}

/** iPhone/iPad Safari — no install prompt API; installing is "Share → Add to Home Screen". */
export function isIosSafari() {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  // Other iOS browsers (CriOS, FxiOS…) can't add web apps to the home screen pre-iOS 16.4.
  return isIos && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}
