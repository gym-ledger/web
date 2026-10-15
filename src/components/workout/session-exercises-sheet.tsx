"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { ProgressRing } from "@/components/shared/progress-ring";
import { cn } from "@/lib/utils";

export interface SessionExerciseSummary {
  id: string;
  name: string;
  /** Working (non-drop) sets logged this session. */
  done: number;
  /** Planned set count, or null for ad-hoc / untargeted exercises. */
  target: number | null;
  isAdhoc: boolean;
}

/** Ring fill for an exercise's progress — untargeted exercises read as full once anything is logged. */
export function exerciseProgress(ex: Pick<SessionExerciseSummary, "done" | "target">) {
  if (ex.target != null && ex.target > 0) return ex.done / ex.target;
  return ex.done > 0 ? 1 : 0;
}

export function SessionExercisesSheet({
  open,
  title,
  exercises,
  selectedId,
  onSelect,
  onAddExercise,
  onClose,
}: {
  open: boolean;
  title: string;
  exercises: SessionExerciseSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddExercise: () => void;
  onClose: () => void;
}) {
  const totalDone = exercises.reduce((n, e) => n + e.done, 0);
  const totalTarget = exercises.reduce((n, e) => n + (e.target ?? 0), 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
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
            aria-labelledby="session-exercises-title"
            className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 rounded-t-3xl border-t border-input bg-card px-4 pt-2.5 pb-6"
          >
            <div className="mx-auto h-1 w-11 shrink-0 rounded-full bg-input" />
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div>
                <h2 id="session-exercises-title" className="font-display text-2xl font-bold">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {totalDone} {totalTarget > 0 ? `of ${totalTarget} ` : ""}sets logged
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto">
              {exercises.map((ex, i) => {
                const selected = ex.id === selectedId;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => onSelect(ex.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5 text-left",
                      selected && "text-foreground",
                    )}
                  >
                    <ProgressRing
                      value={exerciseProgress(ex)}
                      size={44}
                      stroke={4}
                      tone={ex.target != null && ex.done >= ex.target ? "success" : "primary"}
                      label={`${ex.name}, ${ex.done}${ex.target != null ? ` of ${ex.target}` : ""} sets`}
                    >
                      <span className={cn("text-[15px] font-bold", selected ? "text-foreground" : "text-muted-foreground")}>
                        {i + 1}
                      </span>
                    </ProgressRing>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-base font-bold">{ex.name}</span>
                      <span className="text-[13px] text-muted-foreground">
                        {selected ? "Current" : ex.done > 0 ? "In progress" : "Not started"}
                        {ex.isAdhoc && " · added"}
                      </span>
                    </span>
                    <span className={cn("num text-lg", ex.done === 0 && "text-muted-foreground")}>
                      {ex.done}
                      {ex.target != null && `/${ex.target}`}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onAddExercise}
                className="mt-3 flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-input text-sm font-semibold text-primary transition-colors hover:border-primary"
              >
                <Plus className="size-4" />
                Add exercise
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
