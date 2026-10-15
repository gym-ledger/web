"use client";

import { logWorkoutSetsBatch, type BatchSetItem } from "@/lib/api/workout";
import { useWorkoutSetQueueStore, type ResolvedSet } from "./workoutSetQueue";
import { startDraftSession, useWorkoutDraftStore } from "./workoutDraft";

let flushing = false;

/**
 * Sends every currently-queued set in one batch call and reconciles the
 * store from the response. Safe to call from multiple places (the periodic
 * timer in WorkoutSyncManager, a manual "Sync now" button) — concurrent
 * calls while one is already in flight are no-ops.
 */
export async function flushWorkoutSetQueue(): Promise<void> {
  if (flushing) return;

  if (useWorkoutSetQueueStore.getState().queue.every((q) => q.status === "syncing")) return;

  flushing = true;

  // Sets logged against a not-yet-created workout (see workoutDraft) need
  // their session to exist first. Network trouble → retry on the next flush;
  // an outright refusal clears the draft and its sets fail below.
  const draft = useWorkoutDraftStore.getState().draft;
  if (draft && useWorkoutSetQueueStore.getState().queue.some((q) => q.workoutSessionId === draft.id)) {
    try {
      await startDraftSession();
    } catch {
      if (useWorkoutDraftStore.getState().draft) {
        useWorkoutSetQueueStore.getState().setLastFlushFailedAt(Date.now());
        flushing = false;
        return;
      }
    }
  }

  // Read after the draft start, which may have remapped session ids.
  const store = useWorkoutSetQueueStore.getState();
  const pending = store.queue.filter((q) => q.status !== "syncing");
  if (pending.length === 0) {
    flushing = false;
    return;
  }
  const clientIds = pending.map((q) => q.clientId);
  store.markSyncing(clientIds);

  try {
    const items: BatchSetItem[] = pending.map((q) => ({
      clientId: q.clientId,
      workoutSessionId: q.workoutSessionId,
      workoutProgramExerciseId: q.workoutProgramExerciseId,
      weight: q.payload.weight,
      toolWeight: q.payload.toolWeight,
      reps: q.payload.reps,
      rir: q.payload.rir,
      effort: q.payload.effort,
      discomfortNotes: q.payload.discomfortNotes,
      isWarmup: q.payload.isWarmup,
      alarmMessage: q.payload.alarmMessage,
      dropSets: q.payload.dropSets,
    }));

    const { results } = await logWorkoutSetsBatch(items);

    const resolved: ResolvedSet[] = [];
    const failedClientIds: string[] = [];
    for (const result of results) {
      if ("error" in result) {
        console.error("Failed to sync queued set", result.client_id, result.error);
        failedClientIds.push(result.client_id);
      } else {
        resolved.push({
          clientId: result.client_id,
          set: result.set,
          dropSets: result.dropSets,
          alarm: result.alarm,
        });
      }
    }
    if (resolved.length > 0) {
      useWorkoutSetQueueStore.getState().markSynced(resolved);
    }
    if (failedClientIds.length > 0) {
      useWorkoutSetQueueStore.getState().markFailed(failedClientIds);
    }
    // Reached the server successfully (even if some items were individually
    // rejected) — that's what the 30s/60s backoff cares about, not
    // per-item outcomes.
    useWorkoutSetQueueStore.getState().setLastFlushFailedAt(null);
  } catch {
    useWorkoutSetQueueStore.getState().markFailed(clientIds);
    useWorkoutSetQueueStore.getState().setLastFlushFailedAt(Date.now());
  } finally {
    flushing = false;
  }
}
