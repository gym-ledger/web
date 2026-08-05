"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DropSetFields, WorkoutSet, WorkoutSetAlarm } from "@/lib/api/workout";

const STORAGE_KEY = "apex-offline-workout-sets";

export interface QueuedSetPayload {
  weight?: number | null;
  toolWeight?: number | null;
  reps: number;
  rir?: number | null;
  effort?: string | null;
  discomfortNotes?: string | null;
  alarmMessage?: string | null;
  dropSets?: DropSetFields[];
}

export interface QueuedSet {
  clientId: string;
  workoutSessionId: string;
  workoutProgramExerciseId: string;
  payload: QueuedSetPayload;
  createdAt: string;
  status: "pending" | "syncing" | "failed";
}

export interface ResolvedSet {
  clientId: string;
  set: WorkoutSet;
  dropSets: WorkoutSet[];
  alarm: WorkoutSetAlarm | null;
}

interface WorkoutSetQueueState {
  queue: QueuedSet[];
  // Server results for recently-synced items, keyed by clientId, so pages
  // watching a specific session can swap their optimistic entry for the
  // canonical one. Entries are consumed (removed) by `consumeResolved`.
  resolved: Record<string, ResolvedSet>;
  lastFlushFailedAt: number | null;

  enqueue: (item: Omit<QueuedSet, "status">) => void;
  markSyncing: (clientIds: string[]) => void;
  markSynced: (results: ResolvedSet[]) => void;
  markFailed: (clientIds: string[]) => void;
  setLastFlushFailedAt: (ts: number | null) => void;
  consumeResolved: (clientId: string) => void;
  pendingCountForSession: (workoutSessionId: string) => number;
}

export const useWorkoutSetQueueStore = create<WorkoutSetQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      resolved: {},
      lastFlushFailedAt: null,

      enqueue: (item) => {
        set((state) => ({
          queue: [...state.queue, { ...item, status: "pending" }],
        }));
      },

      markSyncing: (clientIds) => {
        const ids = new Set(clientIds);
        set((state) => ({
          queue: state.queue.map((q) => (ids.has(q.clientId) ? { ...q, status: "syncing" } : q)),
        }));
      },

      markSynced: (results) => {
        set((state) => {
          const resultsByClientId = new Map(results.map((r) => [r.clientId, r]));
          return {
            queue: state.queue.filter((q) => !resultsByClientId.has(q.clientId)),
            resolved: { ...state.resolved, ...Object.fromEntries(resultsByClientId) },
          };
        });
      },

      markFailed: (clientIds) => {
        const ids = new Set(clientIds);
        set((state) => ({
          queue: state.queue.map((q) => (ids.has(q.clientId) ? { ...q, status: "failed" } : q)),
        }));
      },

      setLastFlushFailedAt: (ts) => set({ lastFlushFailedAt: ts }),

      consumeResolved: (clientId) => {
        set((state) => {
          const next = { ...state.resolved };
          delete next[clientId];
          return { resolved: next };
        });
      },

      pendingCountForSession: (workoutSessionId) =>
        get().queue.filter((q) => q.workoutSessionId === workoutSessionId).length,
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ queue: state.queue }),
    },
  ),
);
