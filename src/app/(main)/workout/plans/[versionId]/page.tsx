"use client";

import { use, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Moon, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  addPlanExercise,
  fetchPlanDetail,
  removePlanExercise,
  reorderPlanExercises,
  resetWorkoutPlanToSource,
  updatePlanExercise,
  type PlanDetail,
  type PlanDetailDay,
  type PlanDetailExercise,
  type PlanDetailSession,
  type PlanExerciseTargets,
} from "@/lib/api/workout";
import type { ExerciseListItem } from "@/lib/api/exercises";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { AddExerciseSheet } from "@/components/workout/add-exercise-sheet";
import { DEFAULT_PLAN_TARGETS, PlanExerciseSheet } from "@/components/workout/plan-exercise-sheet";
import { cn } from "@/lib/utils";

const SPLIT_TYPE_LABELS: Record<string, string> = {
  ppl: "Push / Pull / Legs",
  "upper-lower": "Upper / Lower",
  "full-body": "Full Body",
  custom: "Custom",
};

function setsAndReps(sets: number | null, min: number | null, max: number | null) {
  const reps = min != null && max != null && min !== max ? `${min}–${max}` : (min ?? max);
  if (sets != null && reps != null) return `${sets} × ${reps}`;
  if (sets != null) return `${sets} sets`;
  if (reps != null) return `${reps} reps`;
  return null;
}

function formatRest(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function exerciseTargets(ex: PlanDetailExercise): PlanExerciseTargets {
  // An exercise added mid-workout has no targets until that workout finishes.
  if (ex.target_sets == null || ex.min_reps == null || ex.max_reps == null) {
    return { ...DEFAULT_PLAN_TARGETS, targetRir: ex.target_rir, restSeconds: ex.rest_seconds, notes: ex.notes };
  }
  return {
    targetSets: ex.target_sets,
    minReps: ex.min_reps,
    maxReps: ex.max_reps,
    targetRir: ex.target_rir,
    restSeconds: ex.rest_seconds,
    notes: ex.notes,
  };
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

/** Returns `plan` with one session's exercises replaced. */
function withSessionExercises(plan: PlanDetail, sessionId: string, exercises: PlanDetailExercise[]): PlanDetail {
  return {
    ...plan,
    program_days: plan.program_days.map((day) => ({
      ...day,
      sessions: day.sessions.map((s) => (s.id === sessionId ? { ...s, exercises } : s)),
    })),
  };
}

type Location = { day: PlanDetailDay; session: PlanDetailSession };

type SheetState =
  | ({ kind: "add"; exercise: ExerciseListItem } & Location)
  | ({ kind: "edit"; exercise: PlanDetailExercise } & Location);

function sessionLabel({ day, session }: Location) {
  return day.sessions.length > 1 ? `${day.name} · ${session.name}` : `Day ${day.day_number} · ${day.name}`;
}

function ExerciseMeta({ ex }: { ex: PlanDetailExercise }) {
  const meta = [
    ex.target_rir != null ? `RIR ${ex.target_rir}` : null,
    ex.rest_seconds != null ? `rest ${formatRest(ex.rest_seconds)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // Spans, not <p>: also rendered inside the edit-row <button>.
  return (
    <>
      {meta && <span className="block text-xs text-muted-foreground">{meta}</span>}
      {ex.notes && <span className="mt-0.5 block text-xs text-muted-foreground italic">{ex.notes}</span>}
    </>
  );
}

function DayCard({
  day,
  index,
  editing,
  reorderingSessionId,
  onEditExercise,
  onAddExercise,
  onMoveExercise,
}: {
  day: PlanDetailDay;
  index: number;
  editing: boolean;
  reorderingSessionId: string | null;
  onEditExercise: (session: PlanDetailSession, ex: PlanDetailExercise) => void;
  onAddExercise: (session: PlanDetailSession) => void;
  onMoveExercise: (session: PlanDetailSession, from: number, to: number) => void;
}) {
  const isRestDay = day.sessions.length === 0;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.04 * index, 0.24) }}
      className="flex flex-col"
    >
      <div className="flex items-end justify-between gap-3 border-b border-input pb-2">
        <div className="flex min-w-0 flex-col">
          <span className="label-caps">Day {day.day_number}</span>
          <h3 className="truncate font-display text-2xl leading-tight font-bold">{day.name}</h3>
        </div>
        {isRestDay && (
          <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <Moon className="size-3.5" />
            Rest
          </span>
        )}
      </div>

      {day.sessions.map((session) => {
        const reordering = reorderingSessionId === session.id;
        return (
          <div key={session.id} className="flex flex-col">
            {day.sessions.length > 1 && session.name && (
              <p className="label-caps pt-3 pb-1 text-primary">{session.name}</p>
            )}
            {session.exercises.length === 0 && !editing && (
              <p className="border-b border-line py-2.5 text-[13px] text-muted-foreground">No exercises yet</p>
            )}
            {session.exercises.map((ex, i) => {
              const target = setsAndReps(ex.target_sets, ex.min_reps, ex.max_reps);
              const name = ex.exercise?.name ?? "Exercise";
              const targetNode = (
                <span className="num text-lg">{target ?? <span className="text-sm text-subtle">—</span>}</span>
              );
              if (!editing) {
                return (
                  <div key={ex.id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] gap-2.5 border-b border-line py-2.5">
                    <span className="pt-0.5 text-[13px] font-bold text-subtle">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{name}</p>
                      <ExerciseMeta ex={ex} />
                    </div>
                    {targetNode}
                  </div>
                );
              }
              return (
                <div key={ex.id} className="flex items-center gap-1 border-b border-line">
                  <button
                    type="button"
                    onClick={() => onEditExercise(session, ex)}
                    aria-label={`Edit ${name}`}
                    className="grid min-h-14 min-w-0 flex-1 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 py-2.5 text-left"
                  >
                    <span className="text-[13px] font-bold text-subtle">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{name}</span>
                      <ExerciseMeta ex={ex} />
                    </span>
                    {targetNode}
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${name} up`}
                    disabled={i === 0 || reordering}
                    onClick={() => onMoveExercise(session, i, i - 1)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronUp className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${name} down`}
                    disabled={i === session.exercises.length - 1 || reordering}
                    onClick={() => onMoveExercise(session, i, i + 1)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronDown className="size-5" />
                  </button>
                </div>
              );
            })}
            {editing && (
              <button
                type="button"
                onClick={() => onAddExercise(session)}
                className="mt-2.5 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-input text-[13px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Plus className="size-4" />
                Add exercise
                {day.sessions.length > 1 && ` to ${session.name}`}
              </button>
            )}
          </div>
        );
      })}
    </motion.section>
  );
}

export default function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ versionId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { versionId } = use(params);
  // "Edit" on a My Plans card opens the plan straight into edit mode.
  const startInEditMode = use(searchParams).edit === "1";
  const router = useRouter();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(startInEditMode);
  // Session the exercise search is adding to.
  const [addingTo, setAddingTo] = useState<Location | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [sheetBusy, setSheetBusy] = useState<"save" | "remove" | null>(null);
  const [reorderingSessionId, setReorderingSessionId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const res = await fetchPlanDetail(versionId);
        if (cancelled) return;
        setPlan(res);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFoundFlag(true);
        } else if (err instanceof ApiError && err.status === 403) {
          setError("You don't have access to this workout plan.");
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load workout plan");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [versionId]);

  async function refresh() {
    try {
      setPlan(await fetchPlanDetail(versionId));
    } catch {
      toast.error("Couldn't refresh the plan");
    }
  }

  function findLocation(sessionId: string): Location | null {
    for (const day of plan?.program_days ?? []) {
      const session = day.sessions.find((s) => s.id === sessionId);
      if (session) return { day, session };
    }
    return null;
  }

  function handlePickExercise(exercise: ExerciseListItem) {
    if (!addingTo) return;
    setSheet({ kind: "add", exercise, ...addingTo });
    setAddingTo(null);
  }

  async function handleSave(targets: PlanExerciseTargets) {
    if (!sheet || !plan) return;
    setSheetBusy("save");
    try {
      if (sheet.kind === "add") {
        await addPlanExercise(plan.workout_program_version_id, sheet.session.id, sheet.exercise.id, targets);
        toast.success(`Added ${sheet.exercise.name}`);
      } else {
        await updatePlanExercise(plan.workout_program_version_id, sheet.exercise.id, targets);
      }
      await refresh();
      setSheet(null);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save exercise"));
    } finally {
      setSheetBusy(null);
    }
  }

  async function handleRemove() {
    if (sheet?.kind !== "edit" || !plan) return;
    setSheetBusy("remove");
    try {
      await removePlanExercise(plan.workout_program_version_id, sheet.exercise.id);
      toast.success(`Removed ${sheet.exercise.exercise?.name ?? "exercise"}`);
      await refresh();
      setSheet(null);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to remove exercise"));
    } finally {
      setSheetBusy(null);
    }
  }

  async function handleMove(session: PlanDetailSession, from: number, to: number) {
    if (!plan) return;
    const previous = plan;
    const reordered = [...session.exercises];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setPlan(withSessionExercises(plan, session.id, reordered));
    setReorderingSessionId(session.id);
    try {
      await reorderPlanExercises(plan.workout_program_version_id, session.id, reordered.map((e) => e.id));
    } catch (err) {
      setPlan(previous);
      toast.error(errorMessage(err, "Failed to reorder exercises"));
    } finally {
      setReorderingSessionId(null);
    }
  }

  async function handleReset() {
    if (!plan?.assignment_id) return;
    setResetting(true);
    try {
      const assignment = await resetWorkoutPlanToSource(plan.assignment_id);
      toast.success("Plan updated to the latest version");
      setConfirmReset(false);
      setEditing(false);
      router.replace(`/workout/plans/${assignment.workout_program_version_id}`);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update plan"));
    } finally {
      setResetting(false);
    }
  }

  if (notFoundFlag) notFound();

  if (isPending && !plan && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">{error ?? "Workout plan not found"}</p>
        <Link href="/workout" className="text-sm font-semibold text-primary hover:underline">
          Back to workouts
        </Link>
      </div>
    );
  }

  // `?edit=1` can be on any plan's URL — only the user's own copy is editable.
  const isEditing = editing && plan.is_editable;
  const trainingDays = plan.program_days.filter((d) => d.sessions.some((s) => s.exercises.length > 0)).length;
  const addingToExerciseIds = new Set(
    (addingTo ? findLocation(addingTo.session.id)?.session.exercises ?? [] : [])
      .map((e) => e.exercise?.id)
      .filter((id): id is string => !!id),
  );

  return (
    <div className="flex min-h-screen flex-col pb-6">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-background/95 px-4 py-2 backdrop-blur-sm">
        <Link
          href="/workout"
          className="flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Train
        </Link>
        {plan.is_editable && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={cn(
              "h-10 rounded-full border px-4 text-[13px] font-semibold transition-colors",
              editing
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-card hover:bg-secondary",
            )}
          >
            {editing ? "Done" : "Edit plan"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 px-4 pt-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="label-caps text-primary">{SPLIT_TYPE_LABELS[plan.split_type] ?? plan.split_type}</span>
            <h1 className="font-display text-[34px] leading-none font-bold">{plan.program_name}</h1>
            {plan.version_name && <p className="text-[13px] text-muted-foreground">{plan.version_name}</p>}
          </div>
          <div className="grid grid-cols-3 border-y border-line">
            <div className="flex flex-col items-center gap-1 py-3">
              <span className="num text-[26px]">{plan.training_days}×</span>
              <span className="label-caps">Per week</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-line py-3">
              <span className="num text-[26px]">{plan.duration_weeks ?? "—"}</span>
              <span className="label-caps">Weeks</span>
            </div>
            <div className="flex flex-col items-center gap-1 py-3">
              <span className="num text-[26px]">{trainingDays}</span>
              <span className="label-caps">Training days</span>
            </div>
          </div>
          {plan.description && <p className="text-sm leading-relaxed text-muted-foreground">{plan.description}</p>}
        </motion.div>

        {plan.update_available && plan.assignment_id && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-1">
              <span className="label-caps text-primary">Update available</span>
              <p className="text-[15px] font-semibold">
                A newer version of {plan.program_name} is out
                {plan.update_available.version_name ? ` — ${plan.update_available.version_name}` : ""}.
              </p>
              <p className="text-[13px] text-muted-foreground">
                Updating replaces your copy of this plan, including any changes you&apos;ve made.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/workout/plans/${plan.update_available.workout_program_version_id}`} className="flex-1">
                <Button variant="outline" className="h-11 w-full rounded-xl text-sm font-semibold">
                  See what&apos;s new
                </Button>
              </Link>
              <Button className="h-11 flex-1 rounded-xl text-sm font-semibold" onClick={() => setConfirmReset(true)}>
                Update
              </Button>
            </div>
          </div>
        )}

        {isEditing && (
          <p className="text-[13px] text-muted-foreground">
            Changes apply to your future workouts. Past workouts aren&apos;t affected.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {plan.program_days.map((day, i) => (
            <DayCard
              key={day.id}
              day={day}
              index={i}
              editing={isEditing}
              reorderingSessionId={reorderingSessionId}
              onEditExercise={(session, exercise) => setSheet({ kind: "edit", exercise, day, session })}
              onAddExercise={(session) => setAddingTo({ day, session })}
              onMoveExercise={handleMove}
            />
          ))}
        </div>
      </div>

      <AddExerciseSheet
        open={addingTo != null}
        busy={false}
        description={addingTo ? `Add to ${sessionLabel(addingTo)} in your plan.` : ""}
        inSessionExerciseIds={addingToExerciseIds}
        inSessionLabel="already on this day"
        onClose={() => setAddingTo(null)}
        onPick={handlePickExercise}
      />

      <PlanExerciseSheet
        open={sheet != null}
        exerciseName={
          sheet?.kind === "add" ? sheet.exercise.name : (sheet?.exercise.exercise?.name ?? "Exercise")
        }
        sessionLabel={sheet ? sessionLabel(sheet) : ""}
        initial={sheet?.kind === "edit" ? exerciseTargets(sheet.exercise) : DEFAULT_PLAN_TARGETS}
        mode={sheet?.kind ?? "add"}
        busy={sheetBusy}
        onSave={handleSave}
        onRemove={handleRemove}
        onClose={() => setSheet(null)}
      />

      <AnimatePresence>
        {confirmReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-end justify-center bg-black/70"
            onClick={() => !resetting && setConfirmReset(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-plan-title"
              className="w-full max-w-md rounded-t-3xl border-t border-input bg-card px-4 pt-2.5 pb-6"
            >
              <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-input" />
              <h2 id="reset-plan-title" className="font-display text-2xl font-bold">
                Update to the latest version?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Your copy of {plan.program_name} will be replaced with the newest version, and any exercises
                you&apos;ve added, removed or changed will be lost. Your workout history stays as it is.
              </p>
              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="h-13 flex-1 rounded-xl text-base font-semibold"
                  onClick={() => setConfirmReset(false)}
                  disabled={resetting}
                >
                  Cancel
                </Button>
                <Button variant="light" size="xl" className="flex-1" onClick={handleReset} disabled={resetting}>
                  {resetting && <Loader2 className="animate-spin" />}
                  Update
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
