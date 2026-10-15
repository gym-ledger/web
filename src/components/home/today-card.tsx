"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, ChevronRight, Moon, Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  fetchActiveWorkoutPlans,
  fetchProgramDays,
  fetchProgramDaySessions,
  fetchSessionExercises,
  fetchWorkoutSessions,
} from "@/lib/api/workout";

type CardState =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "no-program" }
  | { status: "rest-day"; programName: string }
  | {
      status: "completed";
      programName: string;
      dayName: string | null;
      sessionId: string;
      duration: string;
    }
  | { status: "scheduled"; programName: string; dayName: string; exercises: ExercisePreview[] };

interface ExercisePreview {
  name: string;
  /** "4 × 6–8" style target, or null when the plan doesn't define one. */
  target: string | null;
}

function formatTarget(sets: number | null, minReps: number | null, maxReps: number | null) {
  const reps =
    minReps != null && maxReps != null && minReps !== maxReps
      ? `${minReps}–${maxReps}`
      : (minReps ?? maxReps);
  if (sets == null && reps == null) return null;
  if (sets == null) return `${reps} reps`;
  if (reps == null) return `${sets} sets`;
  return `${sets} × ${reps}`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** JS `Date.getDay()` is 0=Sun..6=Sat; `program_days.day_number` is 1=Mon..7=Sun. */
function isoWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function formatDuration(startedAtIso: string, completedAtIso: string) {
  const minutes = Math.max(
    1,
    Math.round((new Date(completedAtIso).getTime() - new Date(startedAtIso).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export function TodayCard() {
  const [state, setState] = useState<CardState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [activePlans, recentSessions] = await Promise.all([
        fetchActiveWorkoutPlans(),
        fetchWorkoutSessions({ limit: 10 }),
      ]);
      if (cancelled) return;

      if (activePlans.length === 0) {
        setState({ status: "no-program" });
        return;
      }

      const completedToday = recentSessions.data.find(
        (s) => s.completed_at && isToday(s.completed_at),
      );
      if (completedToday) {
        setState({
          status: "completed",
          programName: completedToday.plan_name,
          dayName: completedToday.day_name,
          sessionId: completedToday.id,
          duration: formatDuration(completedToday.started_at, completedToday.completed_at as string),
        });
        return;
      }

      // "Last used" plan, if there's history for one that's still active —
      // otherwise the most recently added active plan (already the API's
      // default order).
      const mostRecentSession = recentSessions.data[0];
      const currentPlan =
        (mostRecentSession &&
          activePlans.find((p) => p.id === mostRecentSession.program_assignment_id)) ||
        activePlans[0];

      const days = await fetchProgramDays(currentPlan.id);
      if (cancelled) return;
      const todayDay = days.find((d) => d.day_number === isoWeekday(new Date()));

      if (!todayDay) {
        setState({ status: "rest-day", programName: currentPlan.program_name });
        return;
      }

      const sessions = await fetchProgramDaySessions(currentPlan.id, todayDay.id);
      if (cancelled) return;
      const exerciseLists = await Promise.all(
        sessions.map((s) => fetchSessionExercises(currentPlan.id, todayDay.id, s.id)),
      );
      if (cancelled) return;
      const exercises: ExercisePreview[] = exerciseLists.flat().flatMap((pe) =>
        pe.exercise
          ? [{ name: pe.exercise.name, target: formatTarget(pe.target_sets, pe.min_reps, pe.max_reps) }]
          : [],
      );

      setState({
        status: "scheduled",
        programName: currentPlan.program_name,
        dayName: todayDay.name,
        exercises,
      });
    }

    load().catch(() => {
      if (!cancelled) setState({ status: "hidden" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />;
  }

  if (state.status === "hidden") {
    return null;
  }

  if (state.status === "no-program") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="flex flex-col gap-3 rounded-2xl border border-dashed border-input p-5"
      >
        <span className="label-caps text-primary">Up next</span>
        <div>
          <p className="font-display text-2xl font-bold leading-tight">No program yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Pick a workout program to start training.</p>
        </div>
        <Link href="/workout" className="mt-1">
          <Button variant="light" size="xl" className="w-full">
            <Plus />
            Browse programs
          </Button>
        </Link>
      </motion.div>
    );
  }

  if (state.status === "rest-day") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex flex-col gap-1">
          <span className="label-caps">Today · {state.programName}</span>
          <span className="font-display text-[34px] leading-none font-bold">Rest day</span>
          <span className="text-sm text-muted-foreground">Recovery is part of the program.</span>
        </div>
        <Moon className="size-7 shrink-0 text-muted-foreground" strokeWidth={1.6} />
      </motion.div>
    );
  }

  if (state.status === "completed") {
    return (
      <Link href={`/workout/history/${state.sessionId}`} className="block">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="flex flex-col gap-4 rounded-2xl border border-success-line bg-success-surface p-5 transition-transform active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="label-caps text-success">Workout complete</span>
              <span className="truncate font-display text-[34px] leading-none font-bold">
                {state.dayName ?? state.programName}
              </span>
              <span className="text-sm text-muted-foreground">
                {state.programName} · {state.duration}
              </span>
            </div>
            <Check className="size-7 shrink-0 text-success" strokeWidth={2.4} />
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
            View workout
            <ChevronRight className="size-4" />
          </span>
        </motion.div>
      </Link>
    );
  }

  const shown = state.exercises.slice(0, 3);
  const remaining = state.exercises.length - shown.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-[18px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="label-caps truncate text-primary">Up next · {state.programName}</span>
          <span className="truncate font-display text-[34px] leading-none font-bold">{state.dayName}</span>
        </div>
        {state.exercises.length > 0 && (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="num text-[22px]">{state.exercises.length}</span>
            <span className="text-xs text-muted-foreground">exercises</span>
          </div>
        )}
      </div>

      {shown.length > 0 && (
        <div className="flex flex-col gap-2">
          {shown.map((ex, i) => (
            <div key={`${ex.name}-${i}`} className="flex justify-between gap-3 text-sm">
              <span className="truncate">{ex.name}</span>
              {ex.target && <span className="shrink-0 text-muted-foreground">{ex.target}</span>}
            </div>
          ))}
          {remaining > 0 && <span className="text-[13px] text-muted-foreground">+ {remaining} more</span>}
        </div>
      )}

      <Link href="/workout/active" className="block">
        <Button variant="light" size="xl" className="w-full">
          <Play className="fill-current" />
          Start workout
        </Button>
      </Link>
    </motion.div>
  );
}
