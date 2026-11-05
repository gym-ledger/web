// The only place the app touches Capacitor (`@capacitor/*` and other native
// plugins). Everything else imports from here.
//
// Every plugin is loaded with a dynamic import behind `isNativeBuild`, a
// build-time constant. In the web build the branch is dead code, so the
// bundler drops the plugin code entirely and these functions are no-ops.

import { isNativeBuild } from "./build";

export { isNativeBuild };

export type NativePlatform = "ios" | "android";

/** True inside the native app (the Capacitor WebView). */
export function isNative(): boolean {
  return isNativeBuild;
}

/** "ios" / "android" in the native app, null on the web. */
export async function platform(): Promise<NativePlatform | null> {
  if (!isNativeBuild) return null;
  const { Capacitor } = await import("@capacitor/core");
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : null;
}

/**
 * Synchronous platform read for request headers. Capacitor injects its bridge
 * (`window.Capacitor`) before any page script runs, so it's already there by
 * the time the first request goes out.
 */
export function platformSync(): NativePlatform | null {
  if (!isNativeBuild || typeof window === "undefined") return null;
  const p = (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.();
  return p === "ios" || p === "android" ? p : null;
}

/**
 * Sent on every API request from the native app. On sign-in it tells the API
 * to return the refresh token in the body instead of setting a cookie.
 */
export function clientPlatformHeaders(): Record<string, string> {
  const p = platformSync();
  return p ? { "X-Client-Platform": p } : {};
}

// ---- Refresh token (native only) -----------------------------------------
// On the web the refresh token is an httpOnly cookie the page never sees. The
// native app can't use that cookie (the WebView drops it as third-party), so
// it keeps the token in the iOS Keychain / Android Keystore instead.

const REFRESH_TOKEN_KEY = "refresh-token";

async function secureStorage() {
  const { SecureStorage, KeychainAccess } = await import("@aparajita/capacitor-secure-storage");
  return { SecureStorage, KeychainAccess };
}

export async function readRefreshToken(): Promise<string | null> {
  if (!isNativeBuild) return null;
  const { SecureStorage } = await secureStorage();
  const value = await SecureStorage.get(REFRESH_TOKEN_KEY, false, false);
  return typeof value === "string" && value ? value : null;
}

export async function writeRefreshToken(token: string): Promise<void> {
  if (!isNativeBuild) return;
  const { SecureStorage, KeychainAccess } = await secureStorage();
  // Never synced to iCloud and never restored onto another device.
  await SecureStorage.set(REFRESH_TOKEN_KEY, token, false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
}

export async function removeRefreshToken(): Promise<void> {
  if (!isNativeBuild) return;
  const { SecureStorage } = await secureStorage();
  await SecureStorage.remove(REFRESH_TOKEN_KEY, false);
}

// ---- Durable key-value storage (native only) -------------------------------
// Capacitor Preferences: SharedPreferences on Android, UserDefaults on iOS.
// Unlike the WebView's localStorage, the OS doesn't clear these under storage
// pressure. Used as a backup copy of the offline queues (see durableStorage.ts).

export async function preferencesGet(key: string): Promise<string | null> {
  if (!isNativeBuild) return null;
  const { Preferences } = await import("@capacitor/preferences");
  return (await Preferences.get({ key })).value;
}

export async function preferencesSet(key: string, value: string): Promise<void> {
  if (!isNativeBuild) return;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key, value });
}

export async function preferencesRemove(key: string): Promise<void> {
  if (!isNativeBuild) return;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.remove({ key });
}
