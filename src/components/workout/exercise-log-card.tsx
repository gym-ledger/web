"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, History, Eraser, Plus, X, CloudOff, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  fetchExerciseHistory,
  updateWorkoutSet,
  type PlanExercise,
  type WorkoutSet,
  type ExerciseHistorySession,
  type ExerciseHistorySet,
} from "@/lib/api/workout";
import { ApiError } from "@/lib/api-client";
import { ExerciseHistoryPanel } from "./exercise-history-panel";
import { groupSetsWithDropsets } from "@/lib/workout-sets";
import { useWorkoutSetQueueStore } from "@/lib/offline/workoutSetQueue";
import { flushWorkoutSetQueue } from "@/lib/offline/flushWorkoutSetQueue";

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

function formatElapsedSince(fromIso: string, toIso: string) {
  const totalSeconds = Math.max(
    0,
    Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000),
  );
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "Weight" is the added weight (e.g. plates); "tool weight" is the bar/equipment itself. */
function formatLoad(weight: number | null, toolWeight: number | null) {
  if (weight == null && toolWeight == null) return "BW";
  if (toolWeight != null && toolWeight > 0) {
    return `${weight ?? 0}+${toolWeight}kg`;
  }
  return `${weight ?? 0}kg`;
}

interface ExerciseLogCardProps {
  exercise: PlanExercise;
  workoutSessionId: string;
  initialSets: WorkoutSet[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSetLogged: (set: WorkoutSet, dropSets: WorkoutSet[], restSeconds: number) => void;
}

export function ExerciseLogCard({
  exercise,
  workoutSessionId,
  initialSets,
  isExpanded,
  onToggleExpand,
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
  const [updateSaving, setUpdateSaving] = useState(false);

  // Fetched lazily (only once the card is expanded) so we're not firing a
  // history request per exercise on page load.
  const [lastSession, setLastSession] = useState<ExerciseHistorySession | null>(null);
  const [lastSessionLoaded, setLastSessionLoaded] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);

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

  function handleToggle() {
    // isExpanded still reflects the pre-toggle state here, so this fires
    // exactly once on the collapsed -> expanded transition.
    if (!isExpanded && !lastSessionLoaded && exercise.exercise) {
      setPrefillLoading(true);
      fetchExerciseHistory(exercise.exercise.id, 1)
        .then((sessions) => setLastSession(sessions[0] ?? null))
        .catch(() => setLastSession(null))
        .finally(() => {
          setLastSessionLoaded(true);
          setPrefillLoading(false);
        });
    }
    onToggleExpand();
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
      setDropSets(dropSetRowsFromWorkoutSets(currentLatestGroup.drops));
    }
  }

  const hasInput = !!(
    weight || toolWeight || reps || rir || effort || discomfort || alarm || dropSets.length > 0
  );

  function handleClear() {
    setWeight("");
    setToolWeight("");
    setReps("");
    setRir("");
    setEffort("");
    setDiscomfort("");
    setAlarm("");
    setDropSets([]);
  }

  // Not-yet-synced rows use a temporary client-generated id, which the
  // backend doesn't know about yet — editing is blocked until sync resolves
  // it to the real DB row. Drop sets key off their parent's clientId since
  // they don't get their own entry in `optimisticIds`.
  function isPendingSync(set: WorkoutSet) {
    return optimisticIds.has(set.parent_set_id ?? set.id);
  }

  function startEditSet(set: WorkoutSet) {
    setEditingSetId(set.id);
    setEditWeight(set.weight != null ? String(set.weight) : "");
    setEditToolWeight(set.tool_weight != null ? String(set.tool_weight) : "");
    setEditReps(set.reps != null ? String(set.reps) : "");
    setEditRir(set.rir != null ? String(set.rir) : "");
    setEditEffort(set.effort ?? "");
    setEditDiscomfort(set.discomfort_notes ?? "");
  }

  function cancelEditSet() {
    setEditingSetId(null);
  }

  async function handleUpdateSet() {
    if (!editingSetId) return;
    const parsedReps = editReps.trim() ? parseInt(editReps, 10) : NaN;
    if (!editReps.trim() || Number.isNaN(parsedReps) || parsedReps <= 0) {
      toast.error("Reps is required");
      return;
    }

    setUpdateSaving(true);
    try {
      const updated = await updateWorkoutSet(editingSetId, {
        weight: editWeight.trim() ? parseFloat(editWeight) : null,
        toolWeight: editToolWeight.trim() ? parseFloat(editToolWeight) : null,
        reps: parsedReps,
        rir: editRir.trim() ? parseFloat(editRir) : null,
        effort: editEffort.trim() || null,
        discomfortNotes: editDiscomfort.trim() || null,
      });
      setSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingSetId(null);
      toast.success("Set updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update set");
    } finally {
      setUpdateSaving(false);
    }
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
      is_warmup: false,
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

  function renderSetEditForm() {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-secondary/30 p-2.5">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Weight (kg)"
            value={editWeight}
            onChange={(e) => setEditWeight(e.target.value)}
            className="h-8 rounded-lg border border-input bg-input/25 px-2 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="Tool weight (kg)"
            value={editToolWeight}
            onChange={(e) => setEditToolWeight(e.target.value)}
            className="h-8 rounded-lg border border-input bg-input/25 px-2 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Reps *"
            value={editReps}
            onChange={(e) => setEditReps(e.target.value)}
            className="h-8 rounded-lg border border-input bg-input/25 px-2 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="RIR"
            value={editRir}
            onChange={(e) => setEditRir(e.target.value)}
            className="h-8 rounded-lg border border-input bg-input/25 px-2 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <input
          type="text"
          placeholder="Effort"
          value={editEffort}
          onChange={(e) => setEditEffort(e.target.value)}
          className="h-8 rounded-lg border border-input bg-input/25 px-2 text-xs outline-none focus:ring-1 focus:ring-primary/40"
        />
        <input
          type="text"
          placeholder="Joint pain / discomfort (optional)"
          value={editDiscomfort}
          onChange={(e) => setEditDiscomfort(e.target.value)}
          className="h-8 rounded-lg border border-input bg-input/25 px-2 text-xs outline-none focus:ring-1 focus:ring-primary/40"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUpdateSet}
            disabled={updateSaving}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {updateSaving && <Loader2 className="size-3 animate-spin" />}
            Update
          </button>
          <button
            type="button"
            onClick={cancelEditSet}
            disabled={updateSaving}
            className="flex h-8 flex-1 items-center justify-center rounded-lg bg-secondary text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="flex w-full items-start justify-between p-4 text-left">
        <div className="flex-1 min-w-0">
          <button type="button" onClick={handleToggle} className="block w-full text-left">
            <h3 className="text-base font-bold text-foreground leading-tight">
              {exerciseName}
            </h3>
            {groupedSets.length === 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">No sets logged yet</p>
            )}
          </button>
          {groupedSets.length > 0 && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {groupedSets.map(({ main: s, drops }, i) => {
                const mainPending = isPendingSync(s);
                const isEditingMain = editingSetId === s.id;
                return (
                  <div key={s.id} className="flex flex-col gap-0.5">
                    {isEditingMain ? (
                      renderSetEditForm()
                    ) : (
                      <button
                        type="button"
                        onClick={() => !mainPending && startEditSet(s)}
                        disabled={mainPending}
                        className="-mx-1 flex items-center gap-2 rounded-lg px-1 text-left text-sm transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
                      >
                        <span className="w-5 shrink-0 text-center font-semibold text-muted-foreground">
                          {s.set_order}
                        </span>
                        <span className="tabular-nums text-foreground">
                          {formatLoad(s.weight, s.tool_weight)} × {s.reps ?? "—"}
                          {s.rir != null && (
                            <span className="text-muted-foreground"> · RIR {s.rir}</span>
                          )}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                          {mainPending && (
                            <CloudOff className="size-3" aria-label="Not yet synced" />
                          )}
                          {formatTimeOfDay(s.created_at)}
                          {i > 0 &&
                            ` (+${formatElapsedSince(groupedSets[i - 1].main.created_at, s.created_at)})`}
                          {!mainPending && <Pencil className="size-3" aria-hidden />}
                        </span>
                      </button>
                    )}
                    {!isEditingMain && (s.effort || s.discomfort_notes) && (
                      <p className="pl-7 text-xs text-muted-foreground">
                        {[s.effort, s.discomfort_notes].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {drops.map((d) => {
                      const dropPending = isPendingSync(d);
                      const isEditingDrop = editingSetId === d.id;
                      return (
                        <div key={d.id} className="flex flex-col gap-0.5 pl-7">
                          {isEditingDrop ? (
                            renderSetEditForm()
                          ) : (
                            <button
                              type="button"
                              onClick={() => !dropPending && startEditSet(d)}
                              disabled={dropPending}
                              className="-mx-1 flex items-center gap-2 rounded-lg px-1 text-left text-xs transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
                            >
                              <span className="text-muted-foreground">↳ Drop {d.drop_order}</span>
                              <span className="tabular-nums text-foreground">
                                {formatLoad(d.weight, d.tool_weight)} × {d.reps ?? "—"}
                                {d.rir != null && (
                                  <span className="text-muted-foreground"> · RIR {d.rir}</span>
                                )}
                              </span>
                              <span className="ml-auto flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground">
                                {dropPending && (
                                  <CloudOff className="size-3" aria-label="Not yet synced" />
                                )}
                                {formatTimeOfDay(d.created_at)}
                                {!dropPending && <Pencil className="size-3" aria-hidden />}
                              </span>
                            </button>
                          )}
                          {!isEditingDrop && (d.effort || d.discomfort_notes) && (
                            <p className="pl-6 text-[11px] text-muted-foreground">
                              {[d.effort, d.discomfort_notes].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          className="p-0.5"
        >
          {isExpanded ? (
            <ChevronUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
        <div className="flex flex-col gap-3 px-4 pb-4">
          {/* Log a new set */}
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Set {nextSetOrder}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!hasInput}
                  title="Clear inputs"
                  aria-label="Clear inputs"
                  className="flex items-center justify-center rounded-lg bg-secondary p-1.5 text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40"
                >
                  <Eraser className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={handlePrefill}
                  disabled={prefillLoading || !canPrefill}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40"
                >
                  {prefillLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <History className="size-3" />
                  )}
                  Prefill from last time
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-muted-foreground">
                  WEIGHT (KG)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="BW"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-input/25 px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-muted-foreground">
                  TOOL WEIGHT (KG)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. bar 20"
                  value={toolWeight}
                  onChange={(e) => setToolWeight(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-input/25 px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-muted-foreground">
                  REPS <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-input/25 px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-muted-foreground">
                  RIR
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={rir}
                  onChange={(e) => setRir(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-input/25 px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>
            <input
              type="text"
              placeholder="Effort (e.g. felt heavy, easy...)"
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
              className="h-9 rounded-lg border border-input bg-input/25 px-3 text-sm outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              type="text"
              placeholder="Joint pain / discomfort (optional)"
              value={discomfort}
              onChange={(e) => setDiscomfort(e.target.value)}
              className="h-9 rounded-lg border border-input bg-input/25 px-3 text-sm outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              type="text"
              placeholder="Raise an alarm for later (optional)"
              value={alarm}
              onChange={(e) => setAlarm(e.target.value)}
              className="h-9 rounded-lg border border-input bg-input/25 px-3 text-sm outline-none focus:ring-1 focus:ring-primary/40"
            />

            {dropSets.map((d, i) => (
              <div
                key={d.key}
                className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Drop {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDropSetRow(d.key)}
                    aria-label={`Remove drop set ${i + 1}`}
                    className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Weight (kg)"
                    value={d.weight}
                    onChange={(e) => updateDropSetRow(d.key, { weight: e.target.value })}
                    className="h-8 rounded-lg border border-input bg-input/25 px-2 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Tool weight (kg)"
                    value={d.toolWeight}
                    onChange={(e) => updateDropSetRow(d.key, { toolWeight: e.target.value })}
                    className="h-8 rounded-lg border border-input bg-input/25 px-2 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Reps *"
                    value={d.reps}
                    onChange={(e) => updateDropSetRow(d.key, { reps: e.target.value })}
                    className="h-8 rounded-lg border border-input bg-input/25 px-2 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="RIR"
                    value={d.rir}
                    onChange={(e) => updateDropSetRow(d.key, { rir: e.target.value })}
                    className="h-8 rounded-lg border border-input bg-input/25 px-2 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addDropSetRow}
              disabled={dropSets.length >= MAX_DROP_SETS}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
            >
              <Plus className="size-3.5" />
              Drop set{dropSets.length > 0 ? ` (${dropSets.length}/${MAX_DROP_SETS})` : ""}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {groupedSets.length > 0 ? "Add set" : "Log set"}
            </button>
          </div>

          {exercise.exercise && (
            <ExerciseHistoryPanel exerciseId={exercise.exercise.id} />
          )}
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
