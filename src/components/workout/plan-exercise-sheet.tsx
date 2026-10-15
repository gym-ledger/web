"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanExerciseTargets } from "@/lib/api/workout";

const NUM_INPUT =
  "num h-14 w-full rounded-xl border border-input bg-background text-center text-[28px] outline-none placeholder:text-subtle focus:border-primary aria-invalid:border-destructive";
const NUM_INPUT_SM =
  "num h-11 w-full rounded-lg border border-input bg-background text-center text-[20px] outline-none placeholder:text-subtle focus:border-primary aria-invalid:border-destructive";

export const DEFAULT_PLAN_TARGETS: PlanExerciseTargets = {
  targetSets: 3,
  minReps: 8,
  maxReps: 12,
  targetRir: null,
  restSeconds: null,
  notes: null,
};

type Draft = Record<"sets" | "minReps" | "maxReps" | "rir" | "rest" | "notes", string>;

function toDraft(t: PlanExerciseTargets): Draft {
  const str = (n: number | null) => (n == null ? "" : String(n));
  return {
    sets: str(t.targetSets),
    minReps: str(t.minReps),
    maxReps: str(t.maxReps),
    rir: str(t.targetRir),
    rest: str(t.restSeconds),
    notes: t.notes ?? "",
  };
}

/** The draft as targets, or the first problem with it. Mirrors the API's validation. */
function parseDraft(d: Draft): { targets: PlanExerciseTargets } | { error: string; field: keyof Draft } {
  const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);
  const sets = int(d.sets);
  if (!(sets >= 1 && sets <= 20)) return { error: "Sets must be 1–20", field: "sets" };
  const minReps = int(d.minReps);
  if (!(minReps >= 1 && minReps <= 100)) return { error: "Min reps must be 1–100", field: "minReps" };
  const maxReps = int(d.maxReps);
  if (!(maxReps >= 1 && maxReps <= 100)) return { error: "Max reps must be 1–100", field: "maxReps" };
  if (maxReps < minReps) return { error: "Max reps can't be below min reps", field: "maxReps" };
  let targetRir: number | null = null;
  if (d.rir.trim()) {
    targetRir = Number(d.rir);
    if (!(targetRir >= 0 && targetRir <= 10) || !Number.isInteger(targetRir * 2)) {
      return { error: "RIR must be 0–10, in steps of 0.5", field: "rir" };
    }
  }
  let restSeconds: number | null = null;
  if (d.rest.trim()) {
    restSeconds = int(d.rest);
    if (!(restSeconds >= 0 && restSeconds <= 900)) return { error: "Rest must be 0–900 seconds", field: "rest" };
  }
  return {
    targets: { targetSets: sets, minReps, maxReps, targetRir, restSeconds, notes: d.notes.trim() || null },
  };
}

/**
 * Bottom sheet for an exercise's planned targets in the user's plan — used
 * both to add a new exercise and to edit (or remove) an existing one.
 */
export function PlanExerciseSheet({
  open,
  exerciseName,
  sessionLabel,
  initial,
  mode,
  busy,
  onSave,
  onRemove,
  onClose,
}: {
  open: boolean;
  exerciseName: string;
  /** Where in the plan, e.g. "Day 1 · Push". */
  sessionLabel: string;
  initial: PlanExerciseTargets;
  mode: "add" | "edit";
  busy: "save" | "remove" | null;
  onSave: (targets: PlanExerciseTargets) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
          onClick={busy ? undefined : onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-exercise-title"
            className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-input bg-card px-4 pt-2.5 pb-6"
          >
            <div className="mx-auto h-1 w-11 shrink-0 rounded-full bg-input" />
            {/* Unmounted on close (see `open &&`), so each opening starts from `initial`. */}
            <PlanExerciseForm
              exerciseName={exerciseName}
              sessionLabel={sessionLabel}
              initial={initial}
              mode={mode}
              busy={busy}
              onSave={onSave}
              onRemove={onRemove}
              onClose={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlanExerciseForm({
  exerciseName,
  sessionLabel,
  initial,
  mode,
  busy,
  onSave,
  onRemove,
  onClose,
}: Omit<Parameters<typeof PlanExerciseSheet>[0], "open">) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [error, setError] = useState<{ message: string; field: keyof Draft } | null>(null);

  function field(name: keyof Draft) {
    return {
      value: draft[name],
      "aria-invalid": error?.field === name || undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDraft((d) => ({ ...d, [name]: e.target.value }));
        if (error?.field === name) setError(null);
      },
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseDraft(draft);
    if ("error" in parsed) {
      setError({ message: parsed.error, field: parsed.field });
      return;
    }
    onSave(parsed.targets);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="label-caps text-primary">{sessionLabel}</span>
          <h2 id="plan-exercise-title" className="truncate font-display text-2xl leading-tight font-bold">
            {exerciseName}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy != null}
          aria-label="Close"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-foreground disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label-caps">
            Sets <span className="text-destructive">*</span>
          </span>
          <input type="number" inputMode="numeric" min={1} max={20} className={NUM_INPUT} {...field("sets")} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-caps">
            Min reps <span className="text-destructive">*</span>
          </span>
          <input type="number" inputMode="numeric" min={1} max={100} className={NUM_INPUT} {...field("minReps")} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-caps">
            Max reps <span className="text-destructive">*</span>
          </span>
          <input type="number" inputMode="numeric" min={1} max={100} className={NUM_INPUT} {...field("maxReps")} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="label-caps">RIR</span>
          <input
            type="number"
            inputMode="decimal"
            step={0.5}
            min={0}
            max={10}
            placeholder="—"
            className={NUM_INPUT_SM}
            {...field("rir")}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-caps">Rest (sec)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={900}
            placeholder="—"
            className={NUM_INPUT_SM}
            {...field("rest")}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="label-caps">Notes</span>
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Cues, tempo, setup…"
          className="min-h-11 w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] outline-none placeholder:text-subtle focus:border-primary"
          {...field("notes")}
        />
      </label>

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-destructive">
          {error.message}
        </p>
      )}

      <div className="flex gap-3">
        {mode === "edit" && onRemove && (
          <Button
            type="button"
            variant="outline"
            className="h-13 flex-1 rounded-xl border-danger-line text-base font-semibold text-destructive hover:bg-danger-surface"
            disabled={busy != null}
            onClick={onRemove}
          >
            {busy === "remove" && <Loader2 className="animate-spin" />}
            Remove
          </Button>
        )}
        <Button type="submit" variant="default" size="xl" className="flex-1" disabled={busy != null}>
          {busy === "save" && <Loader2 className="animate-spin" />}
          {mode === "add" ? "Add to plan" : "Save"}
        </Button>
      </div>
    </form>
  );
}
