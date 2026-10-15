"use client";

import { use, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, BarChart2, Calendar, Loader2 } from "lucide-react";
import { LineChart } from "@/old-ui/components/progress/mini-chart";
import { fetchExerciseById, type ExerciseDetail } from "@/lib/api/exercises";
import { fetchExerciseHistory, type ExerciseHistorySession } from "@/lib/api/workout";
import { groupSetsWithDropsets } from "@/lib/workout-sets";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const HISTORY_LIMIT = 12;

function load(weight: number | null, toolWeight: number | null) {
  return (weight ?? 0) + (toolWeight ?? 0);
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [history, setHistory] = useState<ExerciseHistorySession[]>([]);
  const [isPending, startTransition] = useTransition();
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const [exerciseRes, historyRes] = await Promise.all([
          fetchExerciseById(id),
          fetchExerciseHistory(id, HISTORY_LIMIT),
        ]);
        if (cancelled) return;
        setExercise(exerciseRes);
        setHistory(historyRes);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFoundFlag(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load exercise");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFoundFlag) notFound();

  if (isPending && !exercise && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">{error ?? "Exercise not found"}</p>
        <Link href="/old/exercises" className="text-sm font-medium text-primary hover:underline">
          Back to exercises
        </Link>
      </div>
    );
  }

  // API returns sessions newest-first; the chart reads left-to-right oldest-first.
  const chronological = [...history].reverse();
  const chartData = chronological
    .map((session) => {
      const mains = groupSetsWithDropsets(session.sets).map((g) => g.main);
      const maxLoad = mains.reduce((m, s) => Math.max(m, load(s.weight, s.tool_weight)), 0);
      return { label: formatShortDate(session.started_at), value: maxLoad };
    })
    .filter((d) => d.value > 0);

  const allSets = history.flatMap((s) => s.sets);
  const bestWeight = allSets.reduce((m, s) => Math.max(m, load(s.weight, s.tool_weight)), 0);
  const totalVolume = allSets.reduce((sum, s) => sum + load(s.weight, s.tool_weight) * (s.reps ?? 0), 0);
  const sessionsCount = history.length;

  const muscles = [...exercise.muscles].sort((a, b) => b.contribution - a.contribution);

  return (
    <div className="flex flex-col min-h-screen pb-4">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/old/exercises">
            <button className="flex size-9 items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
              <ArrowLeft className="size-4 text-foreground" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{exercise.name}</h1>
            {muscles[0] && (
              <p className="text-xs text-muted-foreground">{muscles[0].name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-5">
        {/* Muscles worked */}
        {muscles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card ring-1 ring-foreground/10 p-4"
          >
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
              Muscles worked
            </h2>
            <div className="flex flex-col gap-2.5">
              {muscles.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {Math.round(m.contribution * 100)}%
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", i === 0 ? "bg-primary" : "bg-primary/50")}
                      style={{ width: `${Math.round(m.contribution * 100)}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-sm text-foreground truncate">{m.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats */}
        {sessionsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 text-center">
              <Trophy className="size-4 text-primary mx-auto" />
              <p className="text-lg font-black text-foreground tabular-nums">{bestWeight}kg</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Best weight</p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 text-center">
              <BarChart2 className="size-4 text-primary mx-auto" />
              <p className="text-lg font-black text-foreground tabular-nums">
                {(totalVolume / 1000).toFixed(1)}t
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">Volume (last {sessionsCount})</p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 text-center">
              <Calendar className="size-4 text-primary mx-auto" />
              <p className="text-lg font-black text-foreground tabular-nums">{sessionsCount}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Recent sessions</p>
            </div>
          </motion.div>
        )}

        {/* Max weight chart */}
        {chartData.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">Max weight progress</h2>
              <span className="text-xs text-muted-foreground">Last {chartData.length} sessions</span>
            </div>
            <LineChart data={chartData} height={90} />
          </motion.div>
        )}

        {/* Description */}
        {exercise.description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <h2 className="text-sm font-bold text-foreground mb-2">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {exercise.description}
            </p>
          </motion.div>
        )}

        {/* Session history */}
        {sessionsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Session history</h2>
              <span className="text-xs text-muted-foreground">Last {sessionsCount}</span>
            </div>
            {history.map((session, i) => {
              const mains = groupSetsWithDropsets(session.sets).map((g) => g.main);
              const maxLoad = mains.reduce((m, s) => Math.max(m, load(s.weight, s.tool_weight)), 0);
              return (
                <div
                  key={session.workout_session_id}
                  className={cn(
                    "flex items-center justify-between px-4 py-3",
                    i < history.length - 1 && "border-b border-border/50"
                  )}
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {new Date(session.started_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{mains.length} sets</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {maxLoad}
                    <span className="text-xs font-normal text-muted-foreground">kg</span>
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}

        {sessionsCount === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t logged this exercise yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
