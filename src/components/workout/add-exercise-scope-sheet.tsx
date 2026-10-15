"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export type AddExerciseScope = "session" | "plan";

/**
 * Second step of adding an exercise mid-workout: log it in this workout only,
 * or also add it to this day of the user's plan for every future session.
 */
export function AddExerciseScopeSheet({
  exerciseName,
  dayName,
  busyScope,
  onPick,
  onBack,
  onClose,
}: {
  /** The exercise being added; the sheet is open while this is set. */
  exerciseName: string | null;
  dayName: string;
  /** The option being saved, if any — shows its spinner and locks both. */
  busyScope: AddExerciseScope | null;
  onPick: (scope: AddExerciseScope) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const options: { scope: AddExerciseScope; title: string; body: string }[] = [
    {
      scope: "session",
      title: "Just this workout",
      body: "Log it today only. Your plan stays as it is.",
    },
    {
      scope: "plan",
      title: "All future sessions",
      body: `Add it to ${dayName} in your plan. The sets and reps you log today become its target.`,
    },
  ];

  return (
    <AnimatePresence>
      {exerciseName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
          onClick={busyScope ? undefined : onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-exercise-scope-title"
            className="flex w-full max-w-md flex-col gap-3.5 rounded-t-3xl border-t border-input bg-card px-4 pt-2.5 pb-6"
          >
            <div className="mx-auto h-1 w-11 shrink-0 rounded-full bg-input" />
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={onBack}
                disabled={busyScope != null}
                aria-label="Back to exercise search"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-foreground disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="min-w-0">
                <span className="label-caps text-primary">Add exercise</span>
                <h2 id="add-exercise-scope-title" className="truncate font-display text-2xl leading-tight font-bold">
                  {exerciseName}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {options.map((option) => (
                <button
                  key={option.scope}
                  type="button"
                  disabled={busyScope != null}
                  onClick={() => onPick(option.scope)}
                  className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3 text-left transition-colors hover:border-input disabled:opacity-60"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-bold">{option.title}</span>
                    <span className="text-[13px] text-muted-foreground">{option.body}</span>
                  </span>
                  {busyScope === option.scope ? (
                    <Loader2 className="size-[18px] animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-[18px] text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
