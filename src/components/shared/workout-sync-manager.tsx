"use client";

import { useEffect } from "react";
import { flushWorkoutSetQueue } from "@/lib/offline/flushWorkoutSetQueue";
import { useWorkoutSetQueueStore } from "@/lib/offline/workoutSetQueue";

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
      await flushWorkoutSetQueue();
      if (cancelled) return;
      const failedRecently = useWorkoutSetQueueStore.getState().lastFlushFailedAt != null;
      timeoutId = setTimeout(tick, failedRecently ? BACKOFF_INTERVAL_MS : NORMAL_INTERVAL_MS);
    }

    timeoutId = setTimeout(tick, NORMAL_INTERVAL_MS);

    function handleOnline() {
      flushWorkoutSetQueue();
    }
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
