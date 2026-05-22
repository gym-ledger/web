"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { SetRow } from "./set-row";
import { cn } from "@/lib/utils";
import type { ActiveExercise, ActiveSet } from "@/types";

interface ExerciseCardProps {
  exercise: ActiveExercise;
  onSetUpdate: (exerciseId: string, setId: string, updates: Partial<ActiveSet>) => void;
  onSetComplete: (exerciseId: string, setId: string) => void;
  onAddSet: (exerciseId: string) => void;
}

const muscleColors: Record<string, string> = {
  chest: "text-red-400 bg-red-400/10",
  back: "text-green-400 bg-green-400/10",
  shoulders: "text-yellow-400 bg-yellow-400/10",
  biceps: "text-purple-400 bg-purple-400/10",
  triceps: "text-pink-400 bg-pink-400/10",
  legs: "text-blue-400 bg-blue-400/10",
  glutes: "text-orange-400 bg-orange-400/10",
  core: "text-cyan-400 bg-cyan-400/10",
  lats: "text-emerald-400 bg-emerald-400/10",
};

export function ExerciseCard({
  exercise,
  onSetUpdate,
  onSetComplete,
  onAddSet,
}: ExerciseCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;
  const allComplete = completedSets === totalSets;
  const muscleStyle = muscleColors[exercise.exercise.primaryMuscle] ?? "text-primary bg-primary/10";

  // Previous performance summary
  const prevData = exercise.sets
    .filter((s) => s.previousWeight && s.previousReps)
    .slice(0, 3)
    .map((s) => `${s.previousWeight}×${s.previousReps}`)
    .join(", ");

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl ring-1 overflow-hidden transition-colors",
        allComplete
          ? "bg-card ring-primary/30"
          : "bg-card ring-foreground/10"
      )}
    >
      {/* Exercise header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div>
            <h3 className="text-base font-bold text-foreground leading-tight">
              {exercise.exercise.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs font-medium rounded-md px-1.5 py-0.5", muscleStyle)}>
                {exercise.exercise.primaryMuscle}
              </span>
              <span className="text-xs text-muted-foreground">
                {completedSets}/{totalSets} sets
              </span>
            </div>
            {prevData && (
              <p className="mt-1 text-xs text-muted-foreground">
                Previous: {prevData}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {allComplete && (
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded-lg px-2 py-0.5">
              Done
            </span>
          )}
          {collapsed ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Sets */}
      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-1">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-3 pb-1">
            <span className="w-5 text-center text-[10px] font-medium text-muted-foreground shrink-0">
              SET
            </span>
            <span className="w-14 text-center text-[10px] font-medium text-muted-foreground shrink-0">
              PREV
            </span>
            <span className="flex-1 text-center text-[10px] font-medium text-muted-foreground">
              KG
            </span>
            <span className="w-12 text-center text-[10px] font-medium text-muted-foreground shrink-0">
              REPS
            </span>
            <span className="w-10 text-center text-[10px] font-medium text-muted-foreground shrink-0">
              RIR
            </span>
            <span className="w-9 shrink-0" />
          </div>

          {exercise.sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              onWeightChange={(weight) =>
                onSetUpdate(exercise.id, set.id, { weight })
              }
              onRepsChange={(reps) =>
                onSetUpdate(exercise.id, set.id, { reps })
              }
              onRirChange={(rir) =>
                onSetUpdate(exercise.id, set.id, { rir })
              }
              onComplete={() => onSetComplete(exercise.id, set.id)}
            />
          ))}

          {/* Add set button */}
          <button
            onClick={() => onAddSet(exercise.id)}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors mt-1"
          >
            <Plus className="size-4" />
            Add set
          </button>
        </div>
      )}
    </motion.div>
  );
}
