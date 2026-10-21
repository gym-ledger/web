"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, History, Loader2 } from "lucide-react";
import { fetchExerciseHistory, type ExerciseHistorySession } from "@/lib/api/workout";
import { groupSetsWithDropsets, formatElapsedSince } from "@/lib/workout-sets";
import type { ExerciseHistoryCacheEntry } from "@/lib/workout/exercise-history-cache";

interface ExerciseHistoryPanelProps {
  exerciseId: string;
  /** Only show sessions strictly before this one (excludes it and anything later). */
  beforeSessionId?: string;
  /**
   * Sessions preloaded by the parent (e.g. when an active workout started) —
   * when given, the panel opens instantly from this instead of fetching.
   * "View all logs" still hits the API for anything beyond what's preloaded.
   */
  preloaded?: ExerciseHistoryCacheEntry;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Weight" is the added weight (e.g. plates); "tool weight" is the bar/equipment itself. */
function formatWeightReps(weight: number | null, toolWeight: number | null, reps: number | null) {
  const load =
    weight == null && toolWeight == null
      ? "BW"
      : toolWeight != null && toolWeight > 0
        ? `${weight ?? 0}+${toolWeight}kg`
        : `${weight ?? 0}kg`;
  return `${load} × ${reps ?? "—"}`;
}

export function ExerciseHistoryPanel({
  exerciseId,
  beforeSessionId,
  preloaded,
}: ExerciseHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  // Only populated by an on-demand fetch — either the initial load when there's
  // no `preloaded` data to open from, or "View all logs" going past it.
  const [fetchedSessions, setFetchedSessions] = useState<ExerciseHistorySession[] | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [showingAll, setShowingAll] = useState(false);

  async function loadAll() {
    setFetchLoading(true);
    try {
      const data = await fetchExerciseHistory(exerciseId, 200, beforeSessionId);
      setFetchedSessions(data);
      setShowingAll(true);
    } catch {
      setFetchedSessions([]);
      setShowingAll(true);
    } finally {
      setFetchLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && fetchedSessions === null && !preloaded) {
      setFetchLoading(true);
      fetchExerciseHistory(exerciseId, 5, beforeSessionId)
        .then(setFetchedSessions)
        .catch(() => setFetchedSessions([]))
        .finally(() => setFetchLoading(false));
    }
  }

  const sessions = showingAll ? fetchedSessions : (preloaded?.sessions ?? fetchedSessions);
  const loading = showingAll ? fetchLoading : (preloaded?.loading ?? fetchLoading);

  return (
    <div className="rounded-xl bg-secondary/30">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <History className="size-3.5" />
          Previous performance
        </span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              No previous sets logged for this exercise yet.
            </p>
          ) : (
            <>
              {sessions.map((session) => (
                <div
                  key={session.workout_session_id}
                  className="rounded-lg bg-background/60 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {session.plan_name} · {session.day_name ?? "Added exercise"}
                      {session.session_name ? ` (${session.session_name})` : ""}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDate(session.started_at)}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {groupSetsWithDropsets(session.sets).map(({ main: s, drops }, i, groups) => (
                      <div key={s.id} className="flex flex-col gap-1">
                        <div className="flex items-start gap-2 text-xs">
                          <span className="w-4 shrink-0 text-center font-semibold text-muted-foreground">
                            {s.set_order}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="tabular-nums text-foreground">
                              {formatWeightReps(s.weight, s.tool_weight, s.reps)}
                              {s.rir != null && (
                                <span className="text-muted-foreground"> · RIR {s.rir}</span>
                              )}
                            </span>
                            {(s.effort || s.discomfort_notes) && (
                              <p className="mt-0.5 text-muted-foreground">
                                {[s.effort, s.discomfort_notes].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          {i > 0 && (
                            <span
                              title={`Started ${formatElapsedSince(groups[i - 1].main.created_at, s.created_at)} after the previous set`}
                              className="shrink-0 tabular-nums text-[10px] text-muted-foreground"
                            >
                              +{formatElapsedSince(groups[i - 1].main.created_at, s.created_at)}
                            </span>
                          )}
                        </div>
                        {drops.map((d) => (
                          <div key={d.id} className="flex items-start gap-2 pl-6 text-[11px]">
                            <span className="text-muted-foreground">↳{d.drop_order}</span>
                            <div className="min-w-0 flex-1">
                              <span className="tabular-nums text-foreground">
                                {formatWeightReps(d.weight, d.tool_weight, d.reps)}
                                {d.rir != null && (
                                  <span className="text-muted-foreground"> · RIR {d.rir}</span>
                                )}
                              </span>
                              {(d.effort || d.discomfort_notes) && (
                                <p className="mt-0.5 text-muted-foreground">
                                  {[d.effort, d.discomfort_notes].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!showingAll && (
                <button
                  type="button"
                  onClick={loadAll}
                  className="mt-1 text-center text-xs font-medium text-primary"
                >
                  View all logs
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
