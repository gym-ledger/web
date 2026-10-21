"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, ChevronRight, Moon, Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/archive/old-ui/components/ui/button";
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
  | { status: "scheduled"; programName: string; dayName: string; exercises: string[] };

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
      const exercises = exerciseLists
        .flat()
        .map((pe) => pe.exercise?.name)
        .filter((n): n is string => !!n);

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
    return <div className="h-40 rounded-2xl bg-card ring-1 ring-foreground/10 animate-pulse" />;
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
        className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border p-6 text-center"
      >
        <p className="text-sm font-semibold text-foreground">No workout program yet</p>
        <p className="text-xs text-muted-foreground">Add a workout program &amp; start your training</p>
        <Link href="/old/workout" className="mt-3">
          <Button className="h-10 rounded-xl font-semibold gap-2" size="sm">
            <Plus className="size-4" />
            Browse workout programs
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
        className="flex items-center gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Moon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Today</p>
          <h3 className="text-base font-bold text-foreground">It&apos;s a rest day</h3>
          <p className="text-xs text-muted-foreground">{state.programName}</p>
        </div>
      </motion.div>
    );
  }

  if (state.status === "completed") {
    return (
      <Link href={`/old/workout/history/${state.sessionId}`} className="block">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 active:scale-[0.99] transition-transform"
        >
          <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
          <div className="p-5 pl-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-500 uppercase tracking-widest">
                  Workout complete
                </p>
                <h3 className="mt-1 text-xl font-bold text-foreground">
                  {state.dayName ?? state.programName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {state.programName} · {state.duration}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Check className="size-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
              View workout
              <ChevronRight className="size-4" />
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
    >
      {/* Blue accent bar */}
      <div className="absolute left-0 top-0 h-full w-1 bg-primary" />

      <div className="p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-widest">
              Today&apos;s Workout
            </p>
            <h3 className="mt-1 text-xl font-bold text-foreground">{state.dayName}</h3>
            <p className="text-sm text-muted-foreground">{state.programName} Program</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Play className="size-5 text-primary fill-primary" />
          </div>
        </div>

        {/* Exercises preview */}
        {state.exercises.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {state.exercises.slice(0, 4).map((ex) => (
              <span
                key={ex}
                className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
              >
                {ex}
              </span>
            ))}
            {state.exercises.length > 4 && (
              <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                +{state.exercises.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Start button */}
        <Link href="/old/workout/active" className="block mt-4">
          <Button className="w-full h-11 rounded-xl font-semibold gap-2">
            <Play className="size-4 fill-current" />
            Start Workout
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
