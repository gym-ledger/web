"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, MoreHorizontal, Plus } from "lucide-react";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { RestTimer } from "@/components/workout/rest-timer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActiveExercise, ActiveSet } from "@/types";
import { exercises } from "@/lib/data/exercises";

// Build the initial workout state
const getExercise = (id: string) => exercises.find((e) => e.id === id)!;

function makeSet(
  setNumber: number,
  prevWeight?: number,
  prevReps?: number
): ActiveSet {
  return {
    id: `set-${Math.random().toString(36).slice(2)}`,
    setNumber,
    weight: prevWeight ?? 0,
    reps: prevReps ?? 0,
    rir: 2,
    completed: false,
    previousWeight: prevWeight,
    previousReps: prevReps,
  };
}

const initialExercises: ActiveExercise[] = [
  {
    id: "ex-bench",
    exercise: getExercise("bench-press"),
    sets: [
      makeSet(1, 80, 10),
      makeSet(2, 80, 10),
      makeSet(3, 80, 8),
      makeSet(4, 77.5, 9),
    ],
  },
  {
    id: "ex-ohp",
    exercise: getExercise("overhead-press"),
    sets: [
      makeSet(1, 60, 9),
      makeSet(2, 60, 8),
      makeSet(3, 57.5, 9),
    ],
  },
  {
    id: "ex-incline",
    exercise: getExercise("incline-db-press"),
    sets: [
      makeSet(1, 32, 12),
      makeSet(2, 32, 11),
      makeSet(3, 30, 12),
    ],
  },
  {
    id: "ex-lateral",
    exercise: getExercise("lateral-raise"),
    sets: [
      makeSet(1, 12, 18),
      makeSet(2, 12, 16),
      makeSet(3, 12, 15),
      makeSet(4, 10, 18),
    ],
  },
  {
    id: "ex-tricep",
    exercise: getExercise("tricep-pushdown"),
    sets: [
      makeSet(1, 25, 15),
      makeSet(2, 25, 13),
      makeSet(3, 22.5, 15),
    ],
  },
];

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>(initialExercises);
  const [elapsed, setElapsed] = useState(0);
  const [restVisible, setRestVisible] = useState(false);
  const [restDuration, setRestDuration] = useState(120);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const totalVolume = activeExercises.reduce((total, ex) => {
    return total + ex.sets
      .filter((s) => s.completed)
      .reduce((sum, s) => sum + s.weight * s.reps, 0);
  }, 0);

  const completedSetsCount = activeExercises.reduce(
    (total, ex) => total + ex.sets.filter((s) => s.completed).length,
    0
  );

  const handleSetUpdate = useCallback(
    (exerciseId: string, setId: string, updates: Partial<ActiveSet>) => {
      setActiveExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setId ? { ...s, ...updates } : s
                ),
              }
            : ex
        )
      );
    },
    []
  );

  const handleSetComplete = useCallback(
    (exerciseId: string, setId: string) => {
      setActiveExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setId ? { ...s, completed: true } : s
                ),
              }
            : ex
        )
      );
      // Determine rest duration for this exercise
      const ex = activeExercises.find((e) => e.id === exerciseId);
      const restSec = ex?.exercise.category === "compound" ? 180 : 90;
      setRestDuration(restSec);
      setRestVisible(true);
    },
    [activeExercises]
  );

  const handleAddSet = useCallback((exerciseId: string) => {
    setActiveExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet = makeSet(
          ex.sets.length + 1,
          lastSet?.weight,
          lastSet?.reps
        );
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  }, []);

  const handleFinish = () => {
    router.push("/home");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Workout name */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              PPL Program
            </p>
            <h1 className="text-base font-bold text-foreground leading-tight truncate">
              Push Day A
            </h1>
          </div>

          {/* Elapsed timer */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-black tabular-nums text-foreground">
              {formatDuration(elapsed)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              elapsed
            </span>
          </div>

          {/* Finish button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowFinishConfirm(true)}
            className="rounded-xl font-semibold"
          >
            Finish
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-secondary">
          <motion.div
            className="h-full bg-primary"
            animate={{
              width: `${(completedSetsCount / activeExercises.reduce((t, ex) => t + ex.sets.length, 0)) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="flex items-center justify-around border-b border-border bg-card px-4 py-2">
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {completedSetsCount}
          </span>
          <span className="text-[10px] text-muted-foreground">sets done</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : "0kg"}
          </span>
          <span className="text-[10px] text-muted-foreground">volume</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {activeExercises.length}
          </span>
          <span className="text-[10px] text-muted-foreground">exercises</span>
        </div>
      </div>

      {/* Scrollable exercise list */}
      <div className="flex flex-col gap-3 px-4 py-4 pb-32">
        {activeExercises.map((ex, i) => (
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
          >
            <ExerciseCard
              exercise={ex}
              onSetUpdate={handleSetUpdate}
              onSetComplete={handleSetComplete}
              onAddSet={handleAddSet}
            />
          </motion.div>
        ))}

        {/* Add exercise button */}
        <button className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
          <Plus className="size-4" />
          Add exercise
        </button>
      </div>

      {/* Rest timer overlay */}
      <RestTimer
        isVisible={restVisible}
        initialSeconds={restDuration}
        onSkip={() => setRestVisible(false)}
        onFinish={() => setRestVisible(false)}
      />

      {/* Finish confirm modal */}
      <AnimatePresence>
        {showFinishConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFinishConfirm(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card p-6 ring-1 ring-foreground/10"
            >
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />
              <h2 className="text-lg font-bold text-foreground">Finish workout?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ve completed {completedSetsCount} sets and lifted{" "}
                {totalVolume > 0
                  ? `${totalVolume.toLocaleString()}kg`
                  : "0kg"}{" "}
                total.
              </p>

              <div className="mt-2 rounded-xl bg-secondary/50 p-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-black text-foreground tabular-nums">
                      {formatDuration(elapsed)}
                    </p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-foreground tabular-nums">
                      {completedSetsCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Sets</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-foreground tabular-nums">
                      {totalVolume > 0
                        ? `${(totalVolume / 1000).toFixed(1)}t`
                        : "0"}
                    </p>
                    <p className="text-xs text-muted-foreground">Volume</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setShowFinishConfirm(false)}
                >
                  Resume
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-12 rounded-xl font-semibold"
                  onClick={handleFinish}
                >
                  Finish workout
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
