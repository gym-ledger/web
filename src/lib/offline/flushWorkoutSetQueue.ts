"use client";

import { logWorkoutSetsBatch, type BatchSetItem } from "@/lib/api/workout";
import { useWorkoutSetQueueStore, type QueuedSet, type ResolvedSet } from "./workoutSetQueue";
import { startDraftSession, useWorkoutDraftStore } from "./workoutDraft";

let flushing = false;

/** Most sets the API takes in one batch call (it rejects more). */
const MAX_SETS_PER_BATCH = 100;

/**
 * Sends every currently-queued set (in batch calls of up to
 * MAX_SETS_PER_BATCH) and reconciles the store from the responses. Safe to
 * call from multiple places (the periodic timer in WorkoutSyncManager, a
 * manual "Sync now" button) — concurrent calls while one is already in
 * flight are no-ops.
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
  store.markSyncing(pending.map((q) => q.clientId));

  try {
    for (let start = 0; start < pending.length; start += MAX_SETS_PER_BATCH) {
      // A failed chunk stops here; it and the chunks after it are retried on the next flush.
      if (!(await flushChunk(pending.slice(start, start + MAX_SETS_PER_BATCH)))) {
        useWorkoutSetQueueStore.getState().markFailed(pending.slice(start).map((q) => q.clientId));
        useWorkoutSetQueueStore.getState().setLastFlushFailedAt(Date.now());
        return;
      }
    }
    // Reached the server successfully (even if some items were individually
    // rejected) — that's what the 30s/60s backoff cares about, not
    // per-item outcomes.
    useWorkoutSetQueueStore.getState().setLastFlushFailedAt(null);
  } finally {
    flushing = false;
  }
}

/** Sends one batch call and reconciles the store. `false` when the call itself failed. */
async function flushChunk(pending: QueuedSet[]): Promise<boolean> {
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
      contraction: q.payload.contraction,
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
    return true;
  } catch {
    return false;
  }
}
