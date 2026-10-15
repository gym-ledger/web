"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Loader2, History, Eraser, Plus, X, CloudOff, Pencil, Flame, AlertTriangle, CornerDownRight, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  type PlanExercise,
  type WorkoutSet,
  type UpdateSetPayload,
  type ExerciseHistorySet,
} from "@/lib/api/workout";
import { ExerciseHistoryPanel } from "./exercise-history-panel";
import { groupSetsWithDropsets, formatElapsedSince } from "@/lib/workout-sets";
import type { ExerciseHistoryCacheEntry } from "@/lib/workout/exercise-history-cache";
import { cn } from "@/lib/utils";
import { useWorkoutSetQueueStore } from "@/lib/offline/workoutSetQueue";
import { flushWorkoutSetQueue } from "@/lib/offline/flushWorkoutSetQueue";
import { useWorkoutSetUpdateQueueStore } from "@/lib/offline/workoutSetUpdateQueue";
import { flushWorkoutSetUpdateQueue } from "@/lib/offline/flushWorkoutSetUpdateQueue";

const MAX_DROP_SETS = 10;

interface DropSetRow {
  key: string;
  weight: string;
  toolWeight: string;
  reps: string;
  rir: string;
  effort: string;
  discomfort: string;
}

function emptyDropSetRow(): DropSetRow {
  return {
    key: crypto.randomUUID(),
    weight: "",
    toolWeight: "",
    reps: "",
    rir: "",
    effort: "",
    discomfort: "",
  };
}

function formatTimeOfDay(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** "Weight" is the added weight (e.g. plates); "tool weight" is the bar/equipment itself. */
function formatLoad(weight: number | null, toolWeight: number | null) {
  if (weight == null && toolWeight == null) return "BW";
  if (toolWeight != null && toolWeight > 0) {
    return `${weight ?? 0}+${toolWeight}kg`;
  }
  return `${weight ?? 0}kg`;
}

// Grows with content (Enter for new lines) instead of scrolling internally —
// effort/discomfort notes are sometimes multiple sentences long.
function AutoResizeTextarea({
  className,
  value,
  ...props
}: ComponentProps<"textarea">) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={1}
      className={cn(
        "min-h-11 w-full resize-none overflow-hidden rounded-xl border border-input bg-background px-3.5 py-3 text-[15px] leading-snug outline-none placeholder:text-subtle focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

const NUM_INPUT =
  "num h-14 w-full rounded-xl border border-input bg-background text-center text-[28px] outline-none placeholder:text-subtle focus:border-primary";
const NUM_INPUT_SM =
  "num h-11 w-full rounded-lg border border-input bg-background text-center text-[20px] outline-none placeholder:text-subtle focus:border-primary";
const CHIP =
  "flex h-9 items-center gap-1.5 rounded-full border border-input bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-40";

function formatRest(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "Target 4 × 6–8 · RIR 2 · rest 2:30" from whatever the plan defines. */
function formatTargetLine(exercise: PlanExercise) {
  const parts: string[] = [];
  const { target_sets, min_reps, max_reps, target_rir, rest_seconds, tempo } = exercise;
  const reps =
    min_reps != null && max_reps != null && min_reps !== max_reps
      ? `${min_reps}–${max_reps}`
      : (min_reps ?? max_reps);
  if (target_sets != null && reps != null) parts.push(`Target ${target_sets} × ${reps}`);
  else if (target_sets != null) parts.push(`Target ${target_sets} sets`);
  else if (reps != null) parts.push(`Target ${reps} reps`);
  if (target_rir != null) parts.push(`RIR ${target_rir}`);
  if (tempo) parts.push(`tempo ${tempo}`);
  if (rest_seconds != null) parts.push(`rest ${formatRest(rest_seconds)}`);
  return parts.join(" · ");
}

/** Effort in grey, discomfort in warning colour — pain notes should never blend in. */
function SetNotes({
  effort,
  discomfort,
  className,
}: {
  effort: string | null;
  discomfort: string | null;
  className?: string;
}) {
  if (!effort && !discomfort) return null;
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {effort && <p className="text-[13px] text-muted-foreground">{effort}</p>}
      {discomfort && (
        <p className="flex items-start gap-1.5 text-[13px] text-warning">
          <CircleAlert className="mt-0.5 size-3 shrink-0" aria-label="Discomfort" />
          {discomfort}
        </p>
      )}
    </div>
  );
}

interface ExerciseLogCardProps {
  exercise: PlanExercise;
  /** 1-based position in the session, for the "Exercise 2 of 6" label. */
  position: number;
  total: number;
  workoutSessionId: string;
  initialSets: WorkoutSet[];
  /** Previous-performance sessions preloaded by the parent when the workout started; undefined until preloading kicks off, `loading: true` while in flight. */
  history: ExerciseHistoryCacheEntry | undefined;
  onSetLogged: (set: WorkoutSet, dropSets: WorkoutSet[], restSeconds: number) => void;
}

export function ExerciseLogCard({
  exercise,
  workoutSessionId,
  initialSets,
  history,
  position,
  total,
  onSetLogged,
}: ExerciseLogCardProps) {
  const [sets, setSets] = useState<WorkoutSet[]>(initialSets);
  const [weight, setWeight] = useState("");
  const [toolWeight, setToolWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState("");
  const [effort, setEffort] = useState("");
  const [discomfort, setDiscomfort] = useState("");
  const [alarm, setAlarm] = useState("");
  // Alarm input is rare (~once every 20-30 sets) — kept collapsed behind a
  // button so the everyday logging form isn't cluttered with it.
  const [showAlarmInput, setShowAlarmInput] = useState(false);
  const [isWarmup, setIsWarmup] = useState(false);
  const [dropSets, setDropSets] = useState<DropSetRow[]>([]);
  // Sets logged optimistically (offline-first) that haven't been confirmed by
  // the server yet — keyed by their local clientId (used as the set's `id`
  // until sync resolves it to the real DB row).
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());

  // Editing an already-logged set (main or drop) — at most one at a time.
  // Reuses one set of form fields regardless of which row is being edited.
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editToolWeight, setEditToolWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editRir, setEditRir] = useState("");
  const [editEffort, setEditEffort] = useState("");
  const [editDiscomfort, setEditDiscomfort] = useState("");
  const [editIsWarmup, setEditIsWarmup] = useState(false);
  // Edits not yet confirmed by the server (still queued/offline) — reactive,
  // so rows update the moment the sync manager flushes them.
  const pendingSetUpdates = useWorkoutSetUpdateQueueStore((state) => state.queue);

  // Most recent session comes from the parent's preloaded history cache
  // (fetched in the background when the workout started) rather than a fetch
  // triggered by expanding this card.
  const lastSession = history?.sessions[0] ?? null;
  const prefillLoading = history?.loading ?? false;

  const exerciseName = exercise.exercise?.name ?? "Exercise";
  const groupedSets = groupSetsWithDropsets(sets);
  const nextSetOrder = groupedSets.length + 1;

  // Mirrors optimisticIds into a ref so the mount-once subscription below
  // always sees the latest pending set — same pattern as RestTimer's
  // onFinishRef, avoiding a stale closure without re-subscribing every render.
  const optimisticIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    optimisticIdsRef.current = optimisticIds;
  }, [optimisticIds]);

  // Reconciles optimistic entries once the offline sync manager confirms
  // them. The setState calls happen inside the async subscribe callback
  // (fired later, on store change), not synchronously during the effect's
  // own run.
  useEffect(() => {
    const unsubscribe = useWorkoutSetQueueStore.subscribe((state) => {
      const pending = optimisticIdsRef.current;
      if (pending.size === 0) return;
      const resolvedNow: string[] = [];
      for (const clientId of pending) {
        if (state.resolved[clientId]) resolvedNow.push(clientId);
      }
      if (resolvedNow.length === 0) return;

      setSets((prevSets) => {
        let next = prevSets;
        for (const clientId of resolvedNow) {
          const result = state.resolved[clientId];
          if (!result) continue;
          next = [
            ...next.filter((s) => s.id !== clientId && s.parent_set_id !== clientId),
            result.set,
            ...result.dropSets,
          ];
        }
        return next;
      });
      setOptimisticIds((prev) => {
        const next = new Set(prev);
        resolvedNow.forEach((id) => next.delete(id));
        return next;
      });
      resolvedNow.forEach((clientId) => useWorkoutSetQueueStore.getState().consumeResolved(clientId));
    });
    return unsubscribe;
  }, []);

  // Reconciles queued edits once the offline sync manager confirms them —
  // swaps the optimistic local edit for the server-confirmed row. Only
  // consumes entries that actually matched a set this card holds, so cards
  // for other exercises don't race each other to consume a shared resolved
  // entry before its owning card has processed it.
  useEffect(() => {
    const unsubscribe = useWorkoutSetUpdateQueueStore.subscribe((state) => {
      if (Object.keys(state.resolved).length === 0) return;
      setSets((prev) => {
        const matchedIds: string[] = [];
        const next = prev.map((s) => {
          const result = state.resolved[s.id];
          if (!result) return s;
          matchedIds.push(s.id);
          return result.set;
        });
        matchedIds.forEach((id) => useWorkoutSetUpdateQueueStore.getState().consumeResolved(id));
        return matchedIds.length > 0 ? next : prev;
      });
    });
    return unsubscribe;
  }, []);

  function addDropSetRow() {
    setDropSets((prev) => (prev.length >= MAX_DROP_SETS ? prev : [...prev, emptyDropSetRow()]));
  }

  function removeDropSetRow(key: string) {
    setDropSets((prev) => prev.filter((d) => d.key !== key));
  }

  function updateDropSetRow(key: string, patch: Partial<DropSetRow>) {
    setDropSets((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function dropSetRowsFromHistory(drops: ExerciseHistorySet[]): DropSetRow[] {
    return drops.map((d) => ({
      key: crypto.randomUUID(),
      weight: d.weight != null ? String(d.weight) : "",
      toolWeight: d.tool_weight != null ? String(d.tool_weight) : "",
      reps: d.reps != null ? String(d.reps) : "",
      rir: d.rir != null ? String(d.rir) : "",
      effort: d.effort ?? "",
      discomfort: d.discomfort_notes ?? "",
    }));
  }

  function dropSetRowsFromWorkoutSets(drops: WorkoutSet[]): DropSetRow[] {
    return drops.map((d) => ({
      key: crypto.randomUUID(),
      weight: d.weight != null ? String(d.weight) : "",
      toolWeight: d.tool_weight != null ? String(d.tool_weight) : "",
      reps: d.reps != null ? String(d.reps) : "",
      rir: d.rir != null ? String(d.rir) : "",
      effort: d.effort ?? "",
      discomfort: d.discomfort_notes ?? "",
    }));
  }

  const lastGroupedSets = lastSession ? groupSetsWithDropsets(lastSession.sets) : [];
  const lastMatchingGroup = lastGroupedSets.find((g) => g.main.set_order === nextSetOrder) ?? null;
  // Fallback when last workout didn't have this many sets: copy whatever was
  // just logged this session instead of leaving the button dead.
  const currentLatestGroup = groupedSets.length > 0 ? groupedSets[groupedSets.length - 1] : null;
  const canPrefill = !!lastMatchingGroup || !!currentLatestGroup;

  function handlePrefill() {
    if (lastMatchingGroup) {
      const s = lastMatchingGroup.main;
      setWeight(s.weight != null ? String(s.weight) : "");
      setToolWeight(s.tool_weight != null ? String(s.tool_weight) : "");
      setReps(s.reps != null ? String(s.reps) : "");
      setRir(s.rir != null ? String(s.rir) : "");
      setEffort(s.effort ?? "");
      setDiscomfort(s.discomfort_notes ?? "");
      setAlarm(s.alarm_message ?? "");
      setShowAlarmInput(!!s.alarm_message);
      setDropSets(dropSetRowsFromHistory(lastMatchingGroup.drops));
      return;
    }
    if (currentLatestGroup) {
      const s = currentLatestGroup.main;
      setWeight(s.weight != null ? String(s.weight) : "");
      setToolWeight(s.tool_weight != null ? String(s.tool_weight) : "");
      setReps(s.reps != null ? String(s.reps) : "");
      setRir(s.rir != null ? String(s.rir) : "");
      setEffort(s.effort ?? "");
      setDiscomfort(s.discomfort_notes ?? "");
      setAlarm("");
      setShowAlarmInput(false);
      setDropSets(dropSetRowsFromWorkoutSets(currentLatestGroup.drops));
    }
  }

  const hasInput = !!(
    weight || toolWeight || reps || rir || effort || discomfort || alarm || isWarmup || dropSets.length > 0
  );

  function handleClear() {
    setWeight("");
    setToolWeight("");
    setReps("");
    setRir("");
    setEffort("");
    setDiscomfort("");
    setAlarm("");
    setShowAlarmInput(false);
    setIsWarmup(false);
    setDropSets([]);
  }

  // Not-yet-synced rows use a temporary client-generated id, which the
  // backend doesn't know about yet — editing is blocked until sync resolves
  // it to the real DB row. Drop sets key off their parent's clientId since
  // they don't get their own entry in `optimisticIds`.
  function isPendingSync(set: WorkoutSet) {
    return optimisticIds.has(set.parent_set_id ?? set.id);
  }

  // A queued edit (last-write-wins per setId) doesn't block re-editing —
  // unlike a not-yet-created set, it's always safe to overwrite a queued
  // edit with a newer one. It only affects the "not yet synced" indicator.
  function hasPendingUpdate(set: WorkoutSet) {
    return set.id in pendingSetUpdates;
  }

  function startEditSet(set: WorkoutSet) {
    setEditingSetId(set.id);
    setEditWeight(set.weight != null ? String(set.weight) : "");
    setEditToolWeight(set.tool_weight != null ? String(set.tool_weight) : "");
    setEditReps(set.reps != null ? String(set.reps) : "");
    setEditRir(set.rir != null ? String(set.rir) : "");
    setEditEffort(set.effort ?? "");
    setEditDiscomfort(set.discomfort_notes ?? "");
    setEditIsWarmup(set.is_warmup);
  }

  function cancelEditSet() {
    setEditingSetId(null);
  }

  function handleUpdateSet() {
    if (!editingSetId) return;
    const parsedReps = editReps.trim() ? parseInt(editReps, 10) : NaN;
    if (!editReps.trim() || Number.isNaN(parsedReps) || parsedReps <= 0) {
      toast.error("Reps is required");
      return;
    }

    const payload: UpdateSetPayload = {
      weight: editWeight.trim() ? parseFloat(editWeight) : null,
      toolWeight: editToolWeight.trim() ? parseFloat(editToolWeight) : null,
      reps: parsedReps,
      rir: editRir.trim() ? parseFloat(editRir) : null,
      effort: editEffort.trim() || null,
      discomfortNotes: editDiscomfort.trim() || null,
      isWarmup: editIsWarmup,
    };
    const setId = editingSetId;

    // Applied instantly and optimistically, mirroring handleSave's pattern
    // for new sets — the real write happens via the offline update queue
    // (flushed immediately if online, otherwise picked up by the app-wide
    // sync manager), so editing a set works the same with or without a
    // connection.
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              weight: payload.weight ?? null,
              tool_weight: payload.toolWeight ?? null,
              reps: payload.reps ?? null,
              rir: payload.rir ?? null,
              effort: payload.effort ?? null,
              discomfort_notes: payload.discomfortNotes ?? null,
              is_warmup: payload.isWarmup ?? false,
            }
          : s,
      ),
    );
    setEditingSetId(null);

    useWorkoutSetUpdateQueueStore.getState().enqueue(setId, payload);
    flushWorkoutSetUpdateQueue();

    toast.success("Set updated");
  }

  function handleSave() {
    const parsedReps = reps.trim() ? parseInt(reps, 10) : NaN;
    if (!reps.trim() || Number.isNaN(parsedReps) || parsedReps <= 0) {
      toast.error("Reps is required");
      return;
    }

    const parsedDropSets: { weight: number | null; toolWeight: number | null; reps: number; rir: number | null; effort: string | null; discomfortNotes: string | null }[] = [];
    for (const d of dropSets) {
      const dReps = d.reps.trim() ? parseInt(d.reps, 10) : NaN;
      if (!d.reps.trim() || Number.isNaN(dReps) || dReps <= 0) {
        toast.error("Reps is required for every drop set");
        return;
      }
      parsedDropSets.push({
        weight: d.weight.trim() ? parseFloat(d.weight) : null,
        toolWeight: d.toolWeight.trim() ? parseFloat(d.toolWeight) : null,
        reps: dReps,
        rir: d.rir.trim() ? parseFloat(d.rir) : null,
        effort: d.effort.trim() || null,
        discomfortNotes: d.discomfort.trim() || null,
      });
    }

    // Logged instantly and optimistically — regardless of connectivity, the
    // real write happens via the offline queue (flushed immediately if
    // online, otherwise picked up by the app-wide sync manager).
    const clientId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const trimmedWeight = weight.trim() ? parseFloat(weight) : null;
    const trimmedToolWeight = toolWeight.trim() ? parseFloat(toolWeight) : null;
    const trimmedRir = rir.trim() ? parseFloat(rir) : null;
    const trimmedEffort = effort.trim() || null;
    const trimmedDiscomfort = discomfort.trim() || null;
    const trimmedAlarm = alarm.trim() || null;

    const optimisticSet: WorkoutSet = {
      id: clientId,
      workout_session_id: workoutSessionId,
      workout_program_exercise_id: exercise.id,
      set_order: nextSetOrder,
      weight: trimmedWeight,
      tool_weight: trimmedToolWeight,
      reps: parsedReps,
      rir: trimmedRir,
      is_warmup: isWarmup,
      effort: trimmedEffort,
      discomfort_notes: trimmedDiscomfort,
      created_at: nowIso,
      parent_set_id: null,
      drop_order: null,
    };
    const optimisticDropSets: WorkoutSet[] = parsedDropSets.map((d, i) => ({
      id: crypto.randomUUID(),
      workout_session_id: workoutSessionId,
      workout_program_exercise_id: exercise.id,
      set_order: nextSetOrder,
      weight: d.weight,
      tool_weight: d.toolWeight,
      reps: d.reps,
      rir: d.rir,
      is_warmup: false,
      effort: d.effort,
      discomfort_notes: d.discomfortNotes,
      created_at: nowIso,
      parent_set_id: clientId,
      drop_order: i + 1,
    }));

    setSets((prev) => [...prev, optimisticSet, ...optimisticDropSets]);
    setOptimisticIds((prev) => new Set(prev).add(clientId));
    setWeight("");
    setToolWeight("");
    setReps("");
    setRir("");
    setEffort("");
    setDiscomfort("");
    setAlarm("");
    setShowAlarmInput(false);
    setIsWarmup(false);
    setDropSets([]);

    useWorkoutSetQueueStore.getState().enqueue({
      clientId,
      workoutSessionId,
      workoutProgramExerciseId: exercise.id,
      payload: {
        weight: trimmedWeight,
        toolWeight: trimmedToolWeight,
        reps: parsedReps,
        rir: trimmedRir,
        effort: trimmedEffort,
        discomfortNotes: trimmedDiscomfort,
        isWarmup,
        alarmMessage: trimmedAlarm,
        dropSets: parsedDropSets,
      },
      createdAt: nowIso,
    });
    flushWorkoutSetQueue();

    if (trimmedAlarm) {
      toast.warning("Set logged — flagged on your dashboard as homework.");
    } else {
      toast.success("Set logged");
    }
    onSetLogged(optimisticSet, optimisticDropSets, exercise.rest_seconds ?? 90);
  }

  const parsedWeight = weight.trim() ? parseFloat(weight) : NaN;
  const parsedToolWeight = toolWeight.trim() ? parseFloat(toolWeight) : NaN;
  const totalLoad =
    Number.isNaN(parsedWeight) && Number.isNaN(parsedToolWeight)
      ? null
      : (Number.isNaN(parsedWeight) ? 0 : parsedWeight) + (Number.isNaN(parsedToolWeight) ? 0 : parsedToolWeight);
  const targetLine = formatTargetLine(exercise);
  // Added to the plan in this workout — its target is still to be set by what's logged.
  const isNewInPlan = exercise.targets_from_workout_session_id != null && exercise.target_sets == null;

  function renderSetEditForm() {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border border-primary bg-card p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="label-caps text-[10px]">Weight kg</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="BW"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              className={NUM_INPUT_SM}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps text-[10px]">Tool weight kg</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="bar"
              value={editToolWeight}
              onChange={(e) => setEditToolWeight(e.target.value)}
              className={NUM_INPUT_SM}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps text-[10px]">
              Reps <span className="text-destructive">*</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={editReps}
              onChange={(e) => setEditReps(e.target.value)}
              className={NUM_INPUT_SM}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps text-[10px]">RIR</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="—"
              value={editRir}
              onChange={(e) => setEditRir(e.target.value)}
              className={NUM_INPUT_SM}
            />
          </label>
        </div>
        <AutoResizeTextarea
          aria-label="Effort"
          placeholder="Effort"
          value={editEffort}
          onChange={(e) => setEditEffort(e.target.value)}
        />
        <AutoResizeTextarea
          aria-label="Joint pain or discomfort"
          placeholder="Joint pain / discomfort (optional)"
          value={editDiscomfort}
          onChange={(e) => setEditDiscomfort(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setEditIsWarmup((v) => !v)}
          aria-pressed={editIsWarmup}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-colors",
            editIsWarmup
              ? "border-warning-line bg-warning-surface text-warning"
              : "border-input bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <Flame className="size-3.5" />
          Warmup set
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUpdateSet}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-primary font-display text-base font-bold tracking-[0.08em] text-primary-foreground uppercase transition-colors hover:bg-primary/90"
          >
            Update
          </button>
          <button
            type="button"
            onClick={cancelEditSet}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-input bg-background text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1">
        <span className="label-caps text-primary">
          Exercise {position} of {total}
          {exercise.exercise_order == null && " · added"}
          {isNewInPlan && " · new in plan"}
        </span>
        <h2 className="font-display text-[34px] leading-none font-bold">{exerciseName}</h2>
        {targetLine && <p className="text-sm text-muted-foreground">{targetLine}</p>}
        {isNewInPlan && (
          <p className="text-sm text-muted-foreground">
            The sets and reps you log today become this exercise&apos;s target in your plan.
          </p>
        )}
        {exercise.notes && <p className="mt-1 text-[13px] text-muted-foreground">{exercise.notes}</p>}
      </div>

      {groupedSets.length > 0 && (
        <div className="flex flex-col border-t border-line">
          {groupedSets.map(({ main: s, drops }, i) => {
            const mainPending = isPendingSync(s);
            const mainNotSynced = mainPending || hasPendingUpdate(s);
            const isEditingMain = editingSetId === s.id;
            return (
              <div key={s.id} className="flex flex-col gap-1 border-b border-line py-2.5">
                {isEditingMain ? (
                  renderSetEditForm()
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className={cn("w-5 shrink-0 font-bold", s.is_warmup ? "text-warning" : "text-success")}>
                        {s.set_order}
                      </span>
                      <span className="num text-xl">
                        {formatLoad(s.weight, s.tool_weight)} × {s.reps ?? "—"}
                      </span>
                      {s.rir != null && <span className="text-[13px] text-muted-foreground">RIR {s.rir}</span>}
                      {s.is_warmup && (
                        <span className="flex items-center gap-0.5 rounded-md bg-warning-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-warning uppercase">
                          <Flame className="size-2.5" />
                          Warmup
                        </span>
                      )}
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-subtle tabular-nums">
                        {mainNotSynced && <CloudOff className="size-3 text-warning" aria-label="Not yet synced" />}
                        {formatTimeOfDay(s.created_at)}
                        {i > 0 && (
                          <span className="text-primary">
                            +{formatElapsedSince(groupedSets[i - 1].main.created_at, s.created_at)}
                          </span>
                        )}
                      </span>
                      {mainPending ? (
                        <span className="w-8 shrink-0" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditSet(s)}
                          aria-label={`Edit set ${s.set_order}`}
                          className="-my-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <SetNotes effort={s.effort} discomfort={s.discomfort_notes} className="pl-[30px]" />
                  </>
                )}
                {drops.map((d) => {
                  const dropPending = isPendingSync(d);
                  const dropNotSynced = dropPending || hasPendingUpdate(d);
                  const isEditingDrop = editingSetId === d.id;
                  return (
                    <div key={d.id} className="flex flex-col gap-0.5 pl-[30px]">
                      {isEditingDrop ? (
                        renderSetEditForm()
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 pt-1">
                            <CornerDownRight className="size-3.5 shrink-0 text-subtle" />
                            <span className="text-[13px] text-muted-foreground">Drop {d.drop_order}</span>
                            <span className="num text-[17px]">
                              {formatLoad(d.weight, d.tool_weight)} × {d.reps ?? "—"}
                            </span>
                            {d.rir != null && <span className="text-[13px] text-muted-foreground">RIR {d.rir}</span>}
                            <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-subtle tabular-nums">
                              {dropNotSynced && <CloudOff className="size-3 text-warning" aria-label="Not yet synced" />}
                              {formatTimeOfDay(d.created_at)}
                            </span>
                            {dropPending ? (
                              <span className="w-8 shrink-0" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditSet(d)}
                                aria-label={`Edit drop ${d.drop_order} of set ${s.set_order}`}
                                className="-my-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            )}
                          </div>
                          <SetNotes effort={d.effort} discomfort={d.discomfort_notes} className="pl-6" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Log a new set */}
      <div className="flex flex-col gap-3.5 rounded-[18px] border border-primary bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-[22px] font-bold">Set {nextSetOrder}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleClear} disabled={!hasInput} className={CHIP}>
              <Eraser className="size-3.5" />
              Clear
            </button>
            <button type="button" onClick={handlePrefill} disabled={prefillLoading || !canPrefill} className={CHIP}>
              {prefillLoading ? <Loader2 className="size-3.5 animate-spin" /> : <History className="size-3.5" />}
              Prefill last time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">Weight kg</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="BW"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={NUM_INPUT}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">Tool weight kg</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="bar 20"
              value={toolWeight}
              onChange={(e) => setToolWeight(e.target.value)}
              className={NUM_INPUT}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">
              Reps <span className="text-destructive">*</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className={NUM_INPUT}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">RIR</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="—"
              value={rir}
              onChange={(e) => setRir(e.target.value)}
              className={NUM_INPUT}
            />
          </label>
        </div>

        {(totalLoad != null || lastMatchingGroup) && (
          <p className="-mt-1 text-[13px] text-muted-foreground">
            {totalLoad != null && (
              <>
                = <span className="font-bold text-foreground">{Math.round(totalLoad * 100) / 100} kg</span> total
              </>
            )}
            {totalLoad != null && lastMatchingGroup && " · "}
            {lastMatchingGroup && (
              <>
                last time set {nextSetOrder}:{" "}
                {formatLoad(lastMatchingGroup.main.weight, lastMatchingGroup.main.tool_weight)} ×{" "}
                {lastMatchingGroup.main.reps ?? "—"}
              </>
            )}
          </p>
        )}

        <button
          type="button"
          onClick={() => setIsWarmup((v) => !v)}
          aria-pressed={isWarmup}
          className={cn(
            "flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-colors",
            isWarmup
              ? "border-warning-line bg-warning-surface text-warning"
              : "border-input bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <Flame className="size-4" />
          {isWarmup ? "Warmup set — on" : "Warmup set"}
        </button>

        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Effort</span>
          <AutoResizeTextarea
            placeholder="How did it feel? e.g. heavy, easy, grindy"
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-caps text-warning">Joint pain / discomfort · optional</span>
          <AutoResizeTextarea
            placeholder="Anything that hurt or felt off"
            value={discomfort}
            onChange={(e) => setDiscomfort(e.target.value)}
          />
        </label>

        {dropSets.map((d, i) => (
          <div key={d.key} className="flex gap-2.5">
            <div className="flex w-3.5 flex-col items-center pt-1">
              <CornerDownRight className="size-3.5 text-primary" />
              <div className="mt-1 w-0.5 flex-1 rounded-full bg-track-primary" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="label-caps text-primary">Drop {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeDropSetRow(d.key)}
                  aria-label={`Remove drop set ${i + 1}`}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-subtle">KG</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="BW"
                    value={d.weight}
                    onChange={(e) => updateDropSetRow(d.key, { weight: e.target.value })}
                    className={NUM_INPUT_SM}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-subtle">TOOL</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="—"
                    value={d.toolWeight}
                    onChange={(e) => updateDropSetRow(d.key, { toolWeight: e.target.value })}
                    className={NUM_INPUT_SM}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-subtle">
                    REPS <span className="text-destructive">*</span>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={d.reps}
                    onChange={(e) => updateDropSetRow(d.key, { reps: e.target.value })}
                    className={NUM_INPUT_SM}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-subtle">RIR</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="—"
                    value={d.rir}
                    onChange={(e) => updateDropSetRow(d.key, { rir: e.target.value })}
                    className={NUM_INPUT_SM}
                  />
                </label>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addDropSetRow}
          disabled={dropSets.length >= MAX_DROP_SETS}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-input text-sm font-semibold text-primary transition-colors hover:border-primary disabled:opacity-40"
        >
          <Plus className="size-4" />
          Drop set{dropSets.length > 0 ? ` (${dropSets.length}/${MAX_DROP_SETS})` : ""}
        </button>

        {showAlarmInput && (
          <div className="flex flex-col gap-1.5">
            <span className="label-caps text-destructive">Flag for later · shows on Home as homework</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                aria-label="Alarm message"
                placeholder="e.g. check shoulder position on bench"
                value={alarm}
                onChange={(e) => setAlarm(e.target.value)}
                className="h-12 min-w-0 flex-1 rounded-xl border border-danger-line bg-danger-surface px-3.5 text-[15px] outline-none placeholder:text-subtle focus:border-destructive"
              />
              <button
                type="button"
                onClick={() => {
                  setAlarm("");
                  setShowAlarmInput(false);
                }}
                aria-label="Cancel alarm"
                className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex h-14 flex-1 items-center justify-center rounded-[14px] bg-primary font-display text-[19px] font-bold tracking-[0.08em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 active:scale-[0.99]"
          >
            Log set {nextSetOrder}
          </button>
          {!showAlarmInput && (
            <button
              type="button"
              onClick={() => setShowAlarmInput(true)}
              aria-label="Raise alarm for later"
              title="Raise alarm for later"
              className="flex size-14 shrink-0 items-center justify-center rounded-[14px] border border-danger-line bg-danger-surface text-destructive transition-colors hover:bg-destructive/15"
            >
              <AlertTriangle className="size-5" />
            </button>
          )}
        </div>
      </div>

      {exercise.exercise && <ExerciseHistoryPanel exerciseId={exercise.exercise.id} preloaded={history} />}
    </div>
  );
}
