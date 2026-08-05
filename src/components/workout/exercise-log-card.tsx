"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, History, Eraser } from "lucide-react";
import { toast } from "sonner";
import {
  logWorkoutSet,
  fetchExerciseHistory,
  type PlanExercise,
  type WorkoutSet,
  type ExerciseHistorySession,
} from "@/lib/api/workout";
import { ExerciseHistoryPanel } from "./exercise-history-panel";

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
  onSetLogged: (set: WorkoutSet, restSeconds: number) => void;
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
  const [saving, setSaving] = useState(false);

  // Fetched lazily (only once the card is expanded) so we're not firing a
  // history request per exercise on page load.
  const [lastSession, setLastSession] = useState<ExerciseHistorySession | null>(null);
  const [lastSessionLoaded, setLastSessionLoaded] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);

  const exerciseName = exercise.exercise?.name ?? "Exercise";
  const nextSetOrder = sets.length + 1;

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

  const lastMatchingSet = lastSession?.sets.find((s) => s.set_order === nextSetOrder) ?? null;
  // Fallback when last workout didn't have this many sets: copy whatever was
  // just logged this session instead of leaving the button dead.
  const currentLatestSet = sets.length > 0 ? sets[sets.length - 1] : null;
  const canPrefill = !!lastMatchingSet || !!currentLatestSet;

  function handlePrefill() {
    if (lastMatchingSet) {
      setWeight(lastMatchingSet.weight != null ? String(lastMatchingSet.weight) : "");
      setToolWeight(lastMatchingSet.tool_weight != null ? String(lastMatchingSet.tool_weight) : "");
      setReps(lastMatchingSet.reps != null ? String(lastMatchingSet.reps) : "");
      setRir(lastMatchingSet.rir != null ? String(lastMatchingSet.rir) : "");
      setEffort(lastMatchingSet.effort ?? "");
      setDiscomfort(lastMatchingSet.discomfort_notes ?? "");
      setAlarm(lastMatchingSet.alarm_message ?? "");
      return;
    }
    if (currentLatestSet) {
      setWeight(currentLatestSet.weight != null ? String(currentLatestSet.weight) : "");
      setToolWeight(currentLatestSet.tool_weight != null ? String(currentLatestSet.tool_weight) : "");
      setReps(currentLatestSet.reps != null ? String(currentLatestSet.reps) : "");
      setRir(currentLatestSet.rir != null ? String(currentLatestSet.rir) : "");
      setEffort(currentLatestSet.effort ?? "");
      setDiscomfort(currentLatestSet.discomfort_notes ?? "");
      setAlarm("");
    }
  }

  const hasInput = !!(weight || toolWeight || reps || rir || effort || discomfort || alarm);

  function handleClear() {
    setWeight("");
    setToolWeight("");
    setReps("");
    setRir("");
    setEffort("");
    setDiscomfort("");
    setAlarm("");
  }

  async function handleSave() {
    const parsedReps = reps.trim() ? parseInt(reps, 10) : NaN;
    if (!reps.trim() || Number.isNaN(parsedReps) || parsedReps <= 0) {
      toast.error("Reps is required");
      return;
    }

    setSaving(true);
    try {
      const { set, alarm: createdAlarm } = await logWorkoutSet({
        workoutSessionId,
        workoutProgramExerciseId: exercise.id,
        weight: weight.trim() ? parseFloat(weight) : null,
        toolWeight: toolWeight.trim() ? parseFloat(toolWeight) : null,
        reps: parsedReps,
        rir: rir.trim() ? parseFloat(rir) : null,
        effort: effort.trim() || null,
        discomfortNotes: discomfort.trim() || null,
        alarmMessage: alarm.trim() || null,
      });
      setSets((prev) => [...prev, set]);
      setWeight("");
      setToolWeight("");
      setReps("");
      setRir("");
      setEffort("");
      setDiscomfort("");
      setAlarm("");
      if (createdAlarm) {
        toast.warning("Set logged — flagged on your dashboard as homework.");
      } else {
        toast.success("Set logged");
      }
      onSetLogged(set, exercise.rest_seconds ?? 90);
    } catch {
      toast.error("Failed to log set");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-start justify-between p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground leading-tight">
            {exerciseName}
          </h3>
          {sets.length === 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">No sets logged yet</p>
          ) : (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {sets.map((s, i) => (
                <div key={s.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-center font-semibold text-muted-foreground">
                      {s.set_order}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {formatLoad(s.weight, s.tool_weight)} × {s.reps ?? "—"}
                      {s.rir != null && (
                        <span className="text-muted-foreground"> · RIR {s.rir}</span>
                      )}
                    </span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatTimeOfDay(s.created_at)}
                      {i > 0 && ` (+${formatElapsedSince(sets[i - 1].created_at, s.created_at)})`}
                    </span>
                  </div>
                  {(s.effort || s.discomfort_notes) && (
                    <p className="pl-7 text-xs text-muted-foreground">
                      {[s.effort, s.discomfort_notes].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

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
                  className="h-9 rounded-lg border border-input bg-background px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
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
                  className="h-9 rounded-lg border border-input bg-background px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
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
                  className="h-9 rounded-lg border border-input bg-background px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
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
                  className="h-9 rounded-lg border border-input bg-background px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>
            <input
              type="text"
              placeholder="Effort (e.g. felt heavy, easy...)"
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              type="text"
              placeholder="Joint pain / discomfort (optional)"
              value={discomfort}
              onChange={(e) => setDiscomfort(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              type="text"
              placeholder="Raise an alarm for later (optional)"
              value={alarm}
              onChange={(e) => setAlarm(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {sets.length > 0 ? "Add set" : "Log set"}
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
