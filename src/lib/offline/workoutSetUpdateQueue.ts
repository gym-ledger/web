"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UpdateSetPayload, WorkoutSet } from "@/lib/api/workout";

const STORAGE_KEY = "apex-offline-workout-set-updates";

export interface QueuedSetUpdate {
  setId: string;
  payload: UpdateSetPayload;
  updatedAt: string;
  status: "pending" | "syncing" | "failed";
}

export interface ResolvedSetUpdate {
  setId: string;
  set: WorkoutSet;
}

interface WorkoutSetUpdateQueueState {
  // Keyed by setId, not a list — editing the same set twice while offline is
  // last-write-wins (only the latest payload needs to ever reach the server).
  queue: Record<string, QueuedSetUpdate>;
  // Server results for recently-synced edits, keyed by setId, so the card
  // that made the edit can reconcile its local optimistic value with what
  // the server actually stored. Consumed (removed) by `consumeResolved`.
  resolved: Record<string, ResolvedSetUpdate>;
  lastFlushFailedAt: number | null;

  enqueue: (setId: string, payload: UpdateSetPayload) => void;
  markSyncing: (setIds: string[]) => void;
  markSynced: (results: ResolvedSetUpdate[]) => void;
  markFailed: (setIds: string[]) => void;
  // The update was rejected by the server for a reason a retry can't fix
  // (e.g. validation) — drop it instead of retrying forever.
  markGivenUp: (setIds: string[]) => void;
  setLastFlushFailedAt: (ts: number | null) => void;
  consumeResolved: (setId: string) => void;
  isPending: (setId: string) => boolean;
}

export const useWorkoutSetUpdateQueueStore = create<WorkoutSetUpdateQueueState>()(
  persist(
    (set, get) => ({
      queue: {},
      resolved: {},
      lastFlushFailedAt: null,

      enqueue: (setId, payload) => {
        set((state) => ({
          queue: {
            ...state.queue,
            [setId]: { setId, payload, updatedAt: new Date().toISOString(), status: "pending" },
          },
        }));
      },

      markSyncing: (setIds) => {
        const ids = new Set(setIds);
        set((state) => {
          const next = { ...state.queue };
          for (const id of Object.keys(next)) {
            if (ids.has(id)) next[id] = { ...next[id], status: "syncing" };
          }
          return { queue: next };
        });
      },

      markSynced: (results) => {
        set((state) => {
          const nextQueue = { ...state.queue };
          const nextResolved = { ...state.resolved };
          for (const { setId, set: updated } of results) {
            delete nextQueue[setId];
            nextResolved[setId] = { setId, set: updated };
          }
          return { queue: nextQueue, resolved: nextResolved };
        });
      },

      markFailed: (setIds) => {
        const ids = new Set(setIds);
        set((state) => {
          const next = { ...state.queue };
          for (const id of Object.keys(next)) {
            if (ids.has(id)) next[id] = { ...next[id], status: "failed" };
          }
          return { queue: next };
        });
      },

      markGivenUp: (setIds) => {
        set((state) => {
          const next = { ...state.queue };
          for (const id of setIds) delete next[id];
          return { queue: next };
        });
      },

      setLastFlushFailedAt: (ts) => set({ lastFlushFailedAt: ts }),

      consumeResolved: (setId) => {
        set((state) => {
          const next = { ...state.resolved };
          delete next[setId];
          return { resolved: next };
        });
      },

      isPending: (setId) => setId in get().queue,
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ queue: state.queue }),
    },
  ),
);
