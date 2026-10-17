"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  currentCacheGeneration,
  peekCachedApiResponse,
  readCachedApiResponse,
  writeCachedApiResponse,
} from "./apiResponseCache";

// Screen-level results live beside the per-request GET copies, under their own prefix.
const QUERY_PREFIX = "/__query__/";

// One network load per key at a time (e.g. two mounts of the same screen).
const inflight = new Map<string, Promise<unknown>>();

interface QueryState<T> {
  key: string | null;
  data: T | undefined;
  hasData: boolean;
  fetched: boolean;
  refreshing: boolean;
  error: unknown;
}

function initialState<T>(key: string | null): QueryState<T> {
  const saved = key ? peekCachedApiResponse<T>(key) : { found: false as const };
  return {
    key,
    data: saved.found ? saved.data : undefined,
    hasData: saved.found,
    fetched: false,
    refreshing: key !== null,
    error: null,
  };
}

/**
 * Overwrites a screen's saved result from outside the screen — after a
 * mutation that makes it wrong (e.g. finishing a workout clears Home's
 * "in progress" banner). A mounted screen picks it up on its next load.
 */
export function setCachedQueryData<T>(key: string, data: T): Promise<void> {
  return writeCachedApiResponse(`${QUERY_PREFIX}${key}`, data);
}

export interface CachedQuery<T> {
  /** The latest data: the saved copy first, then the network's answer. */
  data: T | undefined;
  /** True only while nothing is saved yet and the first load is running. */
  loading: boolean;
  /** True while a network load runs, even if saved data is on screen. */
  refreshing: boolean;
  /** The last load's error, if it failed. Saved data stays in `data`. */
  error: unknown;
  /** Loads again from the network (e.g. after a change elsewhere). */
  refresh: () => Promise<void>;
  /** Replaces the data locally and in the saved copy (after a mutation). */
  mutate: (updater: T | ((prev: T | undefined) => T)) => void;
}

/**
 * Stale-while-revalidate for a screen's data. The last saved result for
 * `key` renders immediately — from memory on in-app navigation, from Cache
 * Storage after a reload — and the network load always runs in the
 * background and replaces it. A spinner is only needed the very first time
 * (`loading`). Offline, the saved copy simply stays.
 *
 * `fetcher` may chain several requests; only its final result is saved.
 * `key` must encode every input the fetcher uses (ids, filters); null skips
 * loading. Saved data is per user: it is wiped with the rest of the API cache
 * on logout.
 */
export function useCachedQuery<T>(key: string | null, fetcher: () => Promise<T>): CachedQuery<T> {
  const storageKey = key === null ? null : `${QUERY_PREFIX}${key}`;

  const [state, setState] = useState<QueryState<T>>(() => initialState<T>(storageKey));
  // Key changed (e.g. another exercise id): start from that key's saved copy.
  const current = state.key === storageKey ? state : initialState<T>(storageKey);
  if (state.key !== storageKey) {
    setState(current);
  }

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const revalidate = useCallback(async () => {
    if (!storageKey) return;
    const generation = currentCacheGeneration();

    let pending = inflight.get(storageKey) as Promise<T> | undefined;
    if (!pending) {
      pending = fetcherRef.current();
      const started = pending;
      inflight.set(storageKey, started);
      started
        .finally(() => {
          if (inflight.get(storageKey) === started) inflight.delete(storageKey);
        })
        .catch(() => {});
    }

    try {
      const data = await pending;
      // Logged out while loading: this belongs to the previous user.
      if (generation !== currentCacheGeneration()) return;
      void writeCachedApiResponse(storageKey, data, generation);
      setState((s) =>
        s.key === storageKey ? { ...s, data, hasData: true, fetched: true, refreshing: false, error: null } : s,
      );
    } catch (error) {
      setState((s) => (s.key === storageKey ? { ...s, fetched: true, refreshing: false, error } : s));
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;

    // Not in memory (first visit since a reload): look in Cache Storage. The
    // network load below may still win the race; a saved copy never
    // overwrites data that is already on screen.
    if (!peekCachedApiResponse(storageKey).found) {
      void readCachedApiResponse<T>(storageKey).then((saved) => {
        if (cancelled || !saved.found) return;
        setState((s) => (s.key === storageKey && !s.hasData ? { ...s, data: saved.data, hasData: true } : s));
      });
    }

    void revalidate();
    return () => {
      cancelled = true;
    };
  }, [storageKey, revalidate]);

  const refresh = useCallback(async () => {
    setState((s) => (s.key === storageKey ? { ...s, refreshing: true } : s));
    await revalidate();
  }, [storageKey, revalidate]);

  const mutate = useCallback(
    (updater: T | ((prev: T | undefined) => T)) => {
      if (!storageKey) return;
      setState((s) => {
        if (s.key !== storageKey) return s;
        const next = typeof updater === "function" ? (updater as (prev: T | undefined) => T)(s.data) : updater;
        // Idempotent, so a double-invoked updater (Strict Mode) is harmless.
        void writeCachedApiResponse(storageKey, next);
        return { ...s, data: next, hasData: true };
      });
    },
    [storageKey],
  );

  return {
    data: current.data,
    loading: storageKey !== null && !current.hasData && !current.fetched,
    refreshing: current.refreshing,
    error: current.error,
    refresh,
    mutate,
  };
}
