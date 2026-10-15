"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { groupSetsWithDropsets, formatWeightReps, type GroupedSet } from "@/lib/workout-sets";
import type { ExerciseHistorySession, ExerciseHistorySet, WorkoutSet } from "@/lib/api/workout";
import { cn } from "@/lib/utils";

/** A set the picker can copy from — a past session's set or one logged earlier in this workout. */
export type PickableSet = ExerciseHistorySet | WorkoutSet;

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function SetRow({
  group,
  onPick,
}: {
  group: GroupedSet<PickableSet>;
  onPick: (group: GroupedSet<PickableSet>) => void;
}) {
  const { main: s, drops } = group;
  const details = [
    s.rir != null ? `RIR ${s.rir}` : null,
    drops.length > 0 ? `+${drops.length} drop${drops.length > 1 ? "s" : ""}` : null,
    s.effort,
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={() => onPick(group)}
      className="grid min-h-12 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-line py-2 text-left transition-colors hover:bg-secondary"
    >
      <span className={cn("text-[13px] font-bold", s.is_warmup ? "text-warning" : "text-subtle")}>{s.set_order}</span>
      <span className="min-w-0">
        <span className="num block text-lg leading-tight">{formatWeightReps(s.weight, s.tool_weight, s.reps)}</span>
        {details.length > 0 && (
          <span className="block truncate text-xs text-muted-foreground">{details.join(" · ")}</span>
        )}
        {s.discomfort_notes && <span className="block truncate text-xs text-warning">{s.discomfort_notes}</span>}
      </span>
      {s.is_warmup ? (
        <span className="rounded-md bg-warning-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-warning uppercase">
          Warmup
        </span>
      ) : (
        <span />
      )}
    </button>
  );
}

/**
 * Opened by press-and-holding "Prefill last time": every set available
 * locally for this exercise, grouped by workout, newest first. Tapping one
 * copies it (and its drop sets) into the set form.
 */
export function PastSetPickerSheet({
  open,
  exerciseName,
  currentSets,
  sessions,
  hasFullHistory,
  onPick,
  onClose,
}: {
  open: boolean;
  exerciseName: string;
  /** Sets already logged in this workout. */
  currentSets: WorkoutSet[];
  /** Past workouts, newest first — excluding this one. */
  sessions: ExerciseHistorySession[];
  /** False when only the recent history preloaded at the start of the workout is available. */
  hasFullHistory: boolean;
  onPick: (group: GroupedSet<PickableSet>) => void;
  onClose: () => void;
}) {
  const currentGroups = groupSetsWithDropsets<PickableSet>(currentSets);
  const isEmpty = currentGroups.length === 0 && sessions.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 flex items-end justify-center bg-black/70"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="past-set-picker-title"
            className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 rounded-t-3xl border-t border-input bg-card px-4 pt-2.5 pb-6"
          >
            <div className="mx-auto h-1 w-11 shrink-0 rounded-full bg-input" />
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="label-caps text-primary">Copy a set</span>
                <h2 id="past-set-picker-title" className="truncate font-display text-2xl leading-tight font-bold">
                  {exerciseName}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isEmpty ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No sets logged for this exercise yet.
                </p>
              ) : (
                <div className="flex flex-col gap-4 pb-2">
                  {currentGroups.length > 0 && (
                    <section className="flex flex-col">
                      <div className="border-b border-input pb-1.5">
                        <span className="label-caps text-success">This workout</span>
                      </div>
                      {currentGroups.map((group) => (
                        <SetRow key={group.main.id} group={group} onPick={onPick} />
                      ))}
                    </section>
                  )}
                  {sessions.map((session) => (
                    <section key={session.workout_session_id} className="flex flex-col">
                      <div className="flex items-baseline justify-between gap-2 border-b border-input pb-1.5">
                        <span className="text-[13px] font-bold">{formatSessionDate(session.started_at)}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {session.day_name ?? "Added exercise"}
                          {session.session_name ? ` · ${session.session_name}` : ""}
                        </span>
                      </div>
                      {groupSetsWithDropsets<PickableSet>(session.sets).map((group) => (
                        <SetRow key={group.main.id} group={group} onPick={onPick} />
                      ))}
                    </section>
                  ))}
                  {!hasFullHistory && (
                    <p className="text-center text-xs text-muted-foreground">
                      Showing your most recent workouts. Tap &ldquo;View all logs&rdquo; under Previous performance
                      to load older ones here.
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
