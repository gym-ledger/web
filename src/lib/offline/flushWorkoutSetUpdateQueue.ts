"use client";

import { updateWorkoutSet, type WorkoutSet } from "@/lib/api/workout";
import { ApiError } from "@/lib/api-client";
import { useWorkoutSetUpdateQueueStore, type ResolvedSetUpdate } from "./workoutSetUpdateQueue";

let flushing = false;

/**
 * Sends every queued set edit individually (no batch-update endpoint exists,
 * and edits are low-volume compared to set creation, so this doesn't need
 * one) and reconciles the store from the responses. Safe to call from
 * multiple places — concurrent calls while one is already in flight are
 * no-ops, mirroring flushWorkoutSetQueue's pattern for created sets.
 */
export async function flushWorkoutSetUpdateQueue(): Promise<void> {
  if (flushing) return;

  const store = useWorkoutSetUpdateQueueStore.getState();
  const pending = Object.values(store.queue).filter((q) => q.status !== "syncing");
  if (pending.length === 0) return;

  flushing = true;
  const setIds = pending.map((q) => q.setId);
  store.markSyncing(setIds);

  try {
    const outcomes = await Promise.allSettled(
      pending.map((q) => updateWorkoutSet(q.setId, q.payload).then((set): { setId: string; set: WorkoutSet } => ({ setId: q.setId, set }))),
    );

    const resolved: ResolvedSetUpdate[] = [];
    const retrySetIds: string[] = [];
    const giveUpSetIds: string[] = [];
    let reachedServer = false;

    outcomes.forEach((outcome, i) => {
      const setId = pending[i].setId;
      if (outcome.status === "fulfilled") {
        resolved.push(outcome.value);
        reachedServer = true;
        return;
      }
      const err = outcome.reason;
      // status 0 is api-client's marker for "never got an HTTP response"
      // (network failure / timeout) — worth retrying. Any real HTTP status
      // means the server was reached and rejected the edit for a reason a
      // retry won't fix (e.g. validation), so give up on it instead of
      // looping forever.
      const isNetworkIssue = err instanceof ApiError && err.status === 0;
      if (isNetworkIssue) {
        retrySetIds.push(setId);
      } else {
        reachedServer = true;
        console.error("Discarding queued set edit — server rejected it", setId, err);
        giveUpSetIds.push(setId);
      }
    });

    if (resolved.length > 0) {
      useWorkoutSetUpdateQueueStore.getState().markSynced(resolved);
    }
    if (retrySetIds.length > 0) {
      useWorkoutSetUpdateQueueStore.getState().markFailed(retrySetIds);
    }
    if (giveUpSetIds.length > 0) {
      useWorkoutSetUpdateQueueStore.getState().markGivenUp(giveUpSetIds);
    }
    useWorkoutSetUpdateQueueStore.getState().setLastFlushFailedAt(reachedServer ? null : Date.now());
  } catch {
    useWorkoutSetUpdateQueueStore.getState().markFailed(setIds);
    useWorkoutSetUpdateQueueStore.getState().setLastFlushFailedAt(Date.now());
  } finally {
    flushing = false;
  }
}
