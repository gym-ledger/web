"use client";

import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { isNativeBuild, preferencesGet, preferencesRemove, preferencesSet } from "@/lib/platform";

/**
 * zustand `persist` storage for data the user can't afford to lose: the
 * offline queues of logged sets and the workout draft. Unsynced workout sets
 * disappearing is the worst failure this app can have.
 *
 * Web: plain localStorage, exactly as before.
 *
 * Native app: a WebView's localStorage can be cleared by the OS under storage
 * pressure (iOS most of all), so every write also goes to native Preferences.
 * Reads stay synchronous from localStorage, so the stores hydrate before first
 * render as they always have. Only if localStorage has lost a key does it
 * fall back to the Preferences copy. That read is async, so pair this storage
 * with a `merge` that keeps anything added before it settles (see
 * mergeQueuedItems below).
 */
const writeChains = new Map<string, Promise<void>>();

/** Preferences writes for one key run in order, so an older value never lands last. */
function chain(key: string, task: () => Promise<void>) {
  const next = (writeChains.get(key) ?? Promise.resolve()).then(task).catch(() => {
    // Best effort: localStorage already has the value.
  });
  writeChains.set(key, next);
}

function safeLocal<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const nativeBackedStorage: StateStorage = {
  getItem(name) {
    const local = safeLocal(() => localStorage.getItem(name), null);
    if (local !== null) return local;
    return preferencesGet(name).then((value) => {
      // Put it back so the next start is synchronous again.
      if (value !== null) safeLocal(() => localStorage.setItem(name, value), undefined);
      return value;
    });
  },
  setItem(name, value) {
    safeLocal(() => localStorage.setItem(name, value), undefined);
    chain(name, () => preferencesSet(name, value));
  },
  removeItem(name) {
    safeLocal(() => localStorage.removeItem(name), undefined);
    chain(name, () => preferencesRemove(name));
  },
};

export function durableJSONStorage<S>() {
  return isNativeBuild
    ? createJSONStorage<S>(() => nativeBackedStorage)
    : createJSONStorage<S>(() => localStorage);
}

/**
 * Merges a list restored from storage with the in-memory one, keeping both
 * sides' items (in-memory wins for the same key). Only matters when the
 * restore was async: anything queued in that moment must survive it.
 */
export function mergeQueuedItems<T>(stored: T[] | undefined, current: T[], keyOf: (item: T) => string): T[] {
  if (!stored?.length) return current;
  const currentKeys = new Set(current.map(keyOf));
  return [...stored.filter((item) => !currentKeys.has(keyOf(item))), ...current];
}
