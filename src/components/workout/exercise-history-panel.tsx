"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, History, Loader2 } from "lucide-react";
import { fetchExerciseHistory, type ExerciseHistorySession } from "@/lib/api/workout";

interface ExerciseHistoryPanelProps {
  exerciseId: string;
  /** Only show sessions strictly before this one (excludes it and anything later). */
  beforeSessionId?: string;
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

export function ExerciseHistoryPanel({ exerciseId, beforeSessionId }: ExerciseHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ExerciseHistorySession[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showingAll, setShowingAll] = useState(false);

  async function load(limit: number, all: boolean) {
    setLoading(true);
    try {
      const data = await fetchExerciseHistory(exerciseId, limit, beforeSessionId);
      setSessions(data);
      setShowingAll(all);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && sessions === null) {
      load(5, false);
    }
  }

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
                      {session.plan_name} · {session.day_name}
                      {session.session_name ? ` (${session.session_name})` : ""}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDate(session.started_at)}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {session.sets.map((s) => (
                      <div key={s.id} className="flex items-start gap-2 text-xs">
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
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!showingAll && (
                <button
                  type="button"
                  onClick={() => load(200, true)}
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
