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
  // Opens straight away when the data is already preloaded (active workout) —
  // otherwise it waits for a tap before fetching.
  const [open, setOpen] = useState(!!preloaded);
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
    <section className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between border-b border-line text-left"
      >
        <span className="label-caps flex items-center gap-1.5">
          <History className="size-3.5" />
          Previous performance
        </span>
        <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
          {open ? "Hide" : "Show"}
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-2.5">
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-[13px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <p className="py-2 text-[13px] text-muted-foreground">No previous sets logged for this exercise yet.</p>
          ) : (
            <>
              {sessions.map((session) => (
                <div
                  key={session.workout_session_id}
                  className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card px-3.5 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate font-bold">
                      {session.plan_name} · {session.day_name ?? "Added exercise"}
                      {session.session_name ? ` (${session.session_name})` : ""}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{formatDate(session.started_at)}</span>
                  </div>

                  {groupSetsWithDropsets(session.sets).map(({ main: s, drops }, i, groups) => (
                    <div key={s.id} className="flex flex-col gap-1">
                      <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-2 text-sm">
                        <span className="text-muted-foreground">{s.set_order}</span>
                        <div className="min-w-0">
                          <span className="tabular-nums">
                            {formatWeightReps(s.weight, s.tool_weight, s.reps)}
                            {s.rir != null && <span className="text-muted-foreground"> · RIR {s.rir}</span>}
                          </span>
                          {s.effort && <p className="text-xs text-muted-foreground">{s.effort}</p>}
                          {s.discomfort_notes && <p className="text-xs text-warning">{s.discomfort_notes}</p>}
                        </div>
                        {i > 0 ? (
                          <span
                            title={`Started ${formatElapsedSince(groups[i - 1].main.created_at, s.created_at)} after the previous set`}
                            className="text-xs text-subtle tabular-nums"
                          >
                            +{formatElapsedSince(groups[i - 1].main.created_at, s.created_at)}
                          </span>
                        ) : (
                          <span />
                        )}
                      </div>
                      {drops.map((d) => (
                        <div key={d.id} className="flex items-start gap-2 pl-[26px] text-[13px]">
                          <span className="text-muted-foreground">↳ {d.drop_order}</span>
                          <div className="min-w-0 flex-1">
                            <span className="tabular-nums">
                              {formatWeightReps(d.weight, d.tool_weight, d.reps)}
                              {d.rir != null && <span className="text-muted-foreground"> · RIR {d.rir}</span>}
                            </span>
                            {d.effort && <p className="text-xs text-muted-foreground">{d.effort}</p>}
                            {d.discomfort_notes && <p className="text-xs text-warning">{d.discomfort_notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {!showingAll && (
                <button
                  type="button"
                  onClick={loadAll}
                  className="flex min-h-11 items-center justify-center text-sm font-semibold text-primary"
                >
                  View all logs
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
