"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError } from "@/lib/api-client";
import { startWorkoutSession, type WorkoutSession } from "@/lib/api/workout";
import { useWorkoutSetQueueStore } from "./workoutSetQueue";

const STORAGE_KEY = "apex-workout-draft";

/**
 * A workout that has been picked (plan → day → session) but not yet written
 * to the API. Picking a day only creates this local draft; the session row is
 * created with the draft's own `id` and `startedAt` right before its first
 * set syncs (or when an ad-hoc exercise is added), so backing out of a
 * mis-tapped day never leaves an empty workout in history.
 */
export interface WorkoutDraft {
  id: string;
  assignmentId: string;
  programDayId: string;
  programDaySessionId: string;
  startedAt: string;
}

interface WorkoutDraftState {
  draft: WorkoutDraft | null;
  /**
   * The server session the last draft became. Its `id` differs from the
   * draft's only when the API resumed a session already in progress for the
   * plan (e.g. started on another device) — pages holding the draft's id swap
   * to this one.
   */
  started: { draftId: string; session: WorkoutSession } | null;
  setDraft: (draft: WorkoutDraft) => void;
  clearDraft: () => void;
  markStarted: (draftId: string, session: WorkoutSession) => void;
}

export const useWorkoutDraftStore = create<WorkoutDraftState>()(
  persist(
    (set) => ({
      draft: null,
      started: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
      markStarted: (draftId, session) =>
        set((state) => ({
          draft: state.draft?.id === draftId ? null : state.draft,
          started: { draftId, session },
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ draft: state.draft }),
    },
  ),
);

let inFlight: Promise<string> | null = null;

/**
 * Creates the API session for the current draft and returns its id. Safe to
 * call concurrently (the sync manager and a page action can race) — callers
 * share one request. Throws if there's no draft or the request fails.
 */
export function startDraftSession(): Promise<string> {
  if (inFlight) return inFlight;
  const draft = useWorkoutDraftStore.getState().draft;
  if (!draft) return Promise.reject(new Error("No workout draft to start"));

  inFlight = (async () => {
    try {
      const session = await startWorkoutSession({
        id: draft.id,
        startedAt: draft.startedAt,
        assignmentId: draft.assignmentId,
        programDayId: draft.programDayId,
        programDaySessionId: draft.programDaySessionId,
      });
      if (session.id !== draft.id) {
        useWorkoutSetQueueStore.getState().remapSession(draft.id, session.id);
      }
      useWorkoutDraftStore.getState().markStarted(draft.id, session);
      return session.id;
    } catch (err) {
      // The API refused the draft outright (plan deactivated, too old, …) —
      // retrying won't help, so drop it; its queued sets then fail visibly.
      // (Not 401/403: an auth hiccup is no reason to lose the workout.)
      if (err instanceof ApiError && [400, 404, 409].includes(err.status)) {
        useWorkoutDraftStore.getState().clearDraft();
      }
      throw err;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
