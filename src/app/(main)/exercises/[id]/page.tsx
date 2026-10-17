"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LineChart } from "@/components/progress/mini-chart";
import { fetchExerciseById, type ExerciseDetail } from "@/lib/api/exercises";
import { fetchExerciseHistory, type ExerciseHistorySession } from "@/lib/api/workout";
import { groupSetsWithDropsets } from "@/lib/workout-sets";
import { ApiError } from "@/lib/api-client";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
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

  const query = useCachedQuery<{ exercise: ExerciseDetail; history: ExerciseHistorySession[] }>(
    `exercises/detail/${id}/${HISTORY_LIMIT}`,
    async () => {
      const [exercise, history] = await Promise.all([fetchExerciseById(id), fetchExerciseHistory(id, HISTORY_LIMIT)]);
      return { exercise, history };
    },
  );
  const exercise = query.data?.exercise ?? null;
  const history = query.data?.history ?? [];
  const isPending = query.loading;
  const notFoundFlag = query.error instanceof ApiError && query.error.status === 404;
  // Saved data stays on screen when a refresh fails (e.g. offline).
  const error =
    query.error && !query.data && !notFoundFlag
      ? query.error instanceof ApiError
        ? query.error.message
        : "Failed to load exercise"
      : null;

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
        <Link href="/exercises" className="text-sm font-medium text-primary hover:underline">
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
    <div className="flex min-h-screen flex-col pb-4">
      <div className="sticky top-0 z-30 border-b border-line bg-background/95 px-4 py-2 backdrop-blur-sm">
        <Link
          href="/exercises"
          className="flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Library
        </Link>
      </div>

      <div className="flex flex-col gap-6 px-4 pt-5">
        <div className="flex flex-col gap-1">
          {muscles[0] && <span className="label-caps text-primary">{muscles[0].name}</span>}
          <h1 className="font-display text-[34px] leading-none font-bold">{exercise.name}</h1>
        </div>

        {sessionsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 border-y border-line"
          >
            <div className="flex flex-col items-center gap-1 py-3">
              <span className="num text-[26px]">
                {bestWeight}
                <span className="text-sm text-muted-foreground">kg</span>
              </span>
              <span className="label-caps text-[10px]">Best load</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-line py-3">
              <span className="num text-[26px]">
                {(totalVolume / 1000).toFixed(1)}
                <span className="text-sm text-muted-foreground">t</span>
              </span>
              <span className="label-caps text-[10px]">Vol · last {sessionsCount}</span>
            </div>
            <div className="flex flex-col items-center gap-1 py-3">
              <span className="num text-[26px]">{sessionsCount}</span>
              <span className="label-caps text-[10px]">Sessions</span>
            </div>
          </motion.div>
        )}

        {chartData.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="label-caps">Top load per session</h2>
              <span className="text-xs text-muted-foreground">Last {chartData.length}</span>
            </div>
            <LineChart data={chartData} height={90} />
          </motion.div>
        )}

        {muscles.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-2.5"
          >
            <h2 className="label-caps">Muscles worked</h2>
            {muscles.map((m, i) => (
              <div key={m.id} className="grid grid-cols-[110px_minmax(0,1fr)_40px] items-center gap-2.5 text-sm">
                <span className="truncate">{m.name}</span>
                <div className="h-2 overflow-hidden rounded-full bg-track-primary">
                  <div
                    className={cn("h-full rounded-full", i === 0 ? "bg-primary" : "bg-primary/60")}
                    style={{ width: `${Math.round(m.contribution * 100)}%` }}
                  />
                </div>
                <span className="text-right font-semibold tabular-nums">{Math.round(m.contribution * 100)}%</span>
              </div>
            ))}
          </motion.section>
        )}

        {exercise.description && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="flex flex-col gap-2"
          >
            <h2 className="label-caps">About</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{exercise.description}</p>
          </motion.section>
        )}

        {sessionsCount > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="flex flex-col"
          >
            <div className="flex items-baseline justify-between border-b border-input pb-2">
              <h2 className="label-caps">Session history</h2>
              <span className="text-xs text-muted-foreground">Last {sessionsCount}</span>
            </div>
            {history.map((session) => {
              const mains = groupSetsWithDropsets(session.sets).map((g) => g.main);
              const maxLoad = mains.reduce((m, s) => Math.max(m, load(s.weight, s.tool_weight)), 0);
              return (
                <div
                  key={session.workout_session_id}
                  className="flex items-center justify-between gap-3 border-b border-line py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {new Date(session.started_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {mains.length} sets · {session.plan_name}
                    </p>
                  </div>
                  <span className="num shrink-0 text-xl">
                    {maxLoad}
                    <span className="text-[13px] text-muted-foreground">kg top</span>
                  </span>
                </div>
              );
            })}
          </motion.section>
        )}

        {sessionsCount === 0 && (
          <p className="rounded-2xl border border-dashed border-input py-8 text-center text-sm text-muted-foreground">
            You haven&apos;t logged this exercise yet.
          </p>
        )}
      </div>
    </div>
  );
}
