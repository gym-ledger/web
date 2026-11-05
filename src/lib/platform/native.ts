// Native app behaviour (Capacitor plugins). Same rules as index.ts: plugins
// load through dynamic imports behind `isNativeBuild`, so the web build
// drops them and every function here is a no-op on the web.

import { isNativeBuild } from "./build";

type Unsubscribe = () => void;

/**
 * Subscribes to a Capacitor plugin listener that is added asynchronously, and
 * returns a synchronous unsubscribe (safe to call before the add resolves).
 */
function asyncListener(add: () => Promise<{ remove: () => Promise<void> } | null>): Unsubscribe {
  let removed = false;
  let handle: { remove: () => Promise<void> } | null = null;
  add()
    .then((h) => {
      handle = h;
      if (removed) void handle?.remove();
    })
    .catch(() => {});
  return () => {
    removed = true;
    void handle?.remove();
  };
}

/** Called when the device regains a network connection (alongside the browser's "online" event). */
export function onNetworkReconnect(callback: () => void): Unsubscribe {
  if (!isNativeBuild) return () => {};
  return asyncListener(async () => {
    const { Network } = await import("@capacitor/network");
    let wasConnected = (await Network.getStatus()).connected;
    return Network.addListener("networkStatusChange", (status) => {
      if (status.connected && !wasConnected) callback();
      wasConnected = status.connected;
    });
  });
}

/** Whether the device has a network connection; `navigator.onLine` on the web. */
export async function isConnected(): Promise<boolean> {
  if (!isNativeBuild) return typeof navigator === "undefined" ? true : navigator.onLine;
  const { Network } = await import("@capacitor/network");
  return (await Network.getStatus()).connected;
}

/** Called when the app comes back to the foreground. */
export function onAppResume(callback: () => void): Unsubscribe {
  if (!isNativeBuild) return () => {};
  return asyncListener(async () => {
    const { App } = await import("@capacitor/app");
    return App.addListener("resume", callback);
  });
}

/** Called with false when the app goes to the background, true when it returns. */
export function onAppStateChange(callback: (isActive: boolean) => void): Unsubscribe {
  if (!isNativeBuild) return () => {};
  return asyncListener(async () => {
    const { App } = await import("@capacitor/app");
    return App.addListener("appStateChange", ({ isActive }) => callback(isActive));
  });
}

/**
 * Takes over the Android back button. `handler` decides what back means;
 * Capacitor's default (WebView history, then exit) no longer applies.
 */
export function onBackButton(handler: (canGoBack: boolean) => void): Unsubscribe {
  if (!isNativeBuild) return () => {};
  return asyncListener(async () => {
    const { App } = await import("@capacitor/app");
    return App.addListener("backButton", ({ canGoBack }) => handler(canGoBack));
  });
}

export async function exitApp(): Promise<void> {
  if (!isNativeBuild) return;
  const { App } = await import("@capacitor/app");
  await App.exitApp();
}

/** Keeps the screen on (during an active workout) or lets it sleep again. */
export async function setKeepAwake(on: boolean): Promise<void> {
  if (!isNativeBuild) return;
  const { KeepAwake } = await import("@capacitor-community/keep-awake");
  if (on) await KeepAwake.keepAwake();
  else await KeepAwake.allowSleep();
}

/** A short, light tap (a set was logged). */
export async function hapticTap(): Promise<void> {
  if (!isNativeBuild) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  await Haptics.impact({ style: ImpactStyle.Light });
}

// ---- Rest timer notification ------------------------------------------------

const REST_NOTIFICATION_ID = 1001;

/**
 * Asks for notification permission if it hasn't been asked yet (called when
 * the first rest timer starts). If the user says no, the timer just works in
 * the foreground as on the web.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNativeBuild) return false;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let { display } = await LocalNotifications.checkPermissions();
  if (display === "prompt" || display === "prompt-with-rationale") {
    ({ display } = await LocalNotifications.requestPermissions());
  }
  return display === "granted";
}

/** Schedules the "rest is over" notification (only while the app is in the background). */
export async function scheduleRestDoneNotification(at: Date): Promise<void> {
  if (!isNativeBuild || at.getTime() <= Date.now()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  if ((await LocalNotifications.checkPermissions()).display !== "granted") return;
  await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
  await LocalNotifications.schedule({
    notifications: [{
      id: REST_NOTIFICATION_ID,
      title: "Rest's over",
      body: "Time for your next set.",
      schedule: { at, allowWhileIdle: true },
      // Inexact on purpose: an exact alarm needs a permission Android 14+
      // doesn't grant by default, and asking means sending the user to a
      // system settings screen mid-workout. It may arrive a little late.
      isExactNotification: false,
    }],
  });
}

export async function cancelRestDoneNotification(): Promise<void> {
  if (!isNativeBuild) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
}

/** Opens a page outside the app in the system browser; the WebView never leaves the app. */
export async function openExternal(url: string): Promise<void> {
  if (!isNativeBuild) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}
