"use client";

import { useEffect } from "react";
import { flushWorkoutSetQueue } from "@/lib/offline/flushWorkoutSetQueue";
import { useWorkoutSetQueueStore } from "@/lib/offline/workoutSetQueue";
import { flushWorkoutSetUpdateQueue } from "@/lib/offline/flushWorkoutSetUpdateQueue";
import { useWorkoutSetUpdateQueueStore } from "@/lib/offline/workoutSetUpdateQueue";
import { onAppResume, onNetworkReconnect } from "@/lib/platform/native";
import { getValidAccessToken } from "@/auth/tokenManager";
import { useAuthStore } from "@/auth/authStore";

const NORMAL_INTERVAL_MS = 30_000;
const BACKOFF_INTERVAL_MS = 60_000;

/**
 * Renders nothing. Mounted once at the app root (`providers.tsx`) so queued
 * workout sets keep trying to sync in the background regardless of which
 * page is active — e.g. a set logged in a dead zone still syncs after the
 * workout is finished and you've navigated to /home.
 */
export function WorkoutSyncManager() {
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function tick() {
      if (cancelled) return;
      await Promise.all([flushWorkoutSetQueue(), flushWorkoutSetUpdateQueue()]);
      if (cancelled) return;
      const failedRecently =
        useWorkoutSetQueueStore.getState().lastFlushFailedAt != null ||
        useWorkoutSetUpdateQueueStore.getState().lastFlushFailedAt != null;
      timeoutId = setTimeout(tick, failedRecently ? BACKOFF_INTERVAL_MS : NORMAL_INTERVAL_MS);
    }

    timeoutId = setTimeout(tick, NORMAL_INTERVAL_MS);

    function handleOnline() {
      flushWorkoutSetQueue();
      flushWorkoutSetUpdateQueue();
    }
    window.addEventListener("online", handleOnline);
    // Native app: the OS's own network status (the WebView's "online" event
    // can lag or miss a reconnect), and coming back to the app. On resume the
    // access token has often expired in the background, so refresh it first.
    const stopReconnect = onNetworkReconnect(handleOnline);
    const stopResume = onAppResume(() => {
      if (useAuthStore.getState().hasSession) {
        getValidAccessToken().catch(() => {}).finally(handleOnline);
      } else {
        handleOnline();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener("online", handleOnline);
      stopReconnect();
      stopResume();
    };
  }, []);

  return null;
}
