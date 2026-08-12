import { fetchExerciseHistory, type ExerciseHistorySession } from "@/lib/api/workout";

/** Sessions preloaded per exercise when a workout starts — enough for "prefill from last time" and an instant first view of "previous performance" without a network round-trip mid-set. */
export const PRELOADED_SESSION_LIMIT = 2;

export interface ExerciseHistoryCacheEntry {
  sessions: ExerciseHistorySession[];
  loading: boolean;
}

export type ExerciseHistoryCache = Record<string, ExerciseHistoryCacheEntry>;

/**
 * Fetches the last `PRELOADED_SESSION_LIMIT` sessions of history for each
 * given exercise in the background. Each exercise resolves independently
 * (rather than waiting on Promise.all) so a card can use its own data the
 * moment it lands instead of waiting on the slowest request over a poor gym
 * connection; a failed fetch resolves to an empty history rather than
 * rejecting, so one bad request doesn't block the others.
 */
export function preloadExerciseHistories(
  exerciseIds: string[],
  onUpdate: (exerciseId: string, entry: ExerciseHistoryCacheEntry) => void,
) {
  for (const exerciseId of exerciseIds) {
    fetchExerciseHistory(exerciseId, PRELOADED_SESSION_LIMIT)
      .then((sessions) => onUpdate(exerciseId, { sessions, loading: false }))
      .catch(() => onUpdate(exerciseId, { sessions: [], loading: false }));
  }
}
