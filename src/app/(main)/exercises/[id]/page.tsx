"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, BarChart2, Calendar } from "lucide-react";
import { LineChart } from "@/components/progress/mini-chart";
import { getExerciseById } from "@/lib/data/exercises";
import { benchExerciseHistory, benchPressProgress } from "@/lib/data/progress";
import { cn } from "@/lib/utils";

const muscleLabels: Record<string, string> = {
  chest: "Pectorals",
  back: "Back",
  shoulders: "Deltoids",
  biceps: "Biceps",
  triceps: "Triceps",
  legs: "Quadriceps / Hamstrings",
  glutes: "Glutes",
  core: "Core / Abs",
  lats: "Latissimus Dorsi",
  traps: "Trapezius",
  calves: "Calves",
  forearms: "Forearms",
};

const difficultyColors = {
  beginner: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  advanced: "text-red-400 bg-red-400/10 border-red-400/20",
};

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const exercise = getExerciseById(id);

  if (!exercise) notFound();

  // For now use bench press data for any exercise (dummy)
  const chartData = benchPressProgress.map((d) => ({ label: d.date, value: d.weight }));
  const history = benchExerciseHistory;
  const currentMax = chartData[chartData.length - 1]?.value ?? 0;

  return (
    <div className="flex flex-col min-h-screen pb-4">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/exercises">
            <button className="flex size-9 items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
              <ArrowLeft className="size-4 text-foreground" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{exercise.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">
              {exercise.primaryMuscle} · {exercise.equipment}
            </p>
          </div>
          <span
            className={cn(
              "text-xs font-medium rounded-lg px-2 py-0.5 border capitalize shrink-0",
              difficultyColors[exercise.difficulty]
            )}
          >
            {exercise.difficulty}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-5">
        {/* Muscle diagram area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card ring-1 ring-foreground/10 p-4"
        >
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
            Muscles worked
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">Primary · </span>
                <span className="text-sm font-semibold text-foreground capitalize">
                  {muscleLabels[exercise.primaryMuscle] ?? exercise.primaryMuscle}
                </span>
              </div>
            </div>
            {exercise.secondaryMuscles.map((muscle) => (
              <div key={muscle} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-secondary-foreground/30 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">Secondary · </span>
                  <span className="text-sm text-foreground capitalize">
                    {muscleLabels[muscle] ?? muscle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 text-center">
            <Trophy className="size-4 text-primary mx-auto" />
            <p className="text-lg font-black text-foreground tabular-nums">{currentMax}kg</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Best weight</p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 text-center">
            <BarChart2 className="size-4 text-primary mx-auto" />
            <p className="text-lg font-black text-foreground tabular-nums">48.2t</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Total volume</p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 text-center">
            <Calendar className="size-4 text-primary mx-auto" />
            <p className="text-lg font-black text-foreground tabular-nums">62</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Sessions</p>
          </div>
        </motion.div>

        {/* Max weight chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Max weight progress</h2>
            <span className="text-xs text-muted-foreground">12 weeks</span>
          </div>
          <LineChart data={chartData} height={90} />
        </motion.div>

        {/* Description */}
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

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <h2 className="text-sm font-bold text-foreground mb-3">Form cues</h2>
          <div className="flex flex-col gap-2">
            {exercise.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Session history */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Session history</h2>
            <span className="text-xs text-muted-foreground">Last 6</span>
          </div>
          {history.map((session, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between px-4 py-3",
                i < history.length - 1 && "border-b border-border/50"
              )}
            >
              <div>
                <p className="text-xs font-semibold text-foreground">{session.date}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{session.sets}</p>
              </div>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {session.maxWeight}
                <span className="text-xs font-normal text-muted-foreground">kg</span>
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
