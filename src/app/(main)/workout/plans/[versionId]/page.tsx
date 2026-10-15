"use client";

import { use, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Moon } from "lucide-react";
import { fetchPlanDetail, type PlanDetail, type PlanDetailDay } from "@/lib/api/workout";
import { ApiError } from "@/lib/api-client";

const SPLIT_TYPE_LABELS: Record<string, string> = {
  ppl: "Push / Pull / Legs",
  "upper-lower": "Upper / Lower",
  "full-body": "Full Body",
  custom: "Custom",
};

function setsAndReps(sets: number | null, min: number | null, max: number | null) {
  const reps = min != null && max != null && min !== max ? `${min}–${max}` : (min ?? max);
  if (sets != null && reps != null) return `${sets} × ${reps}`;
  if (sets != null) return `${sets} sets`;
  if (reps != null) return `${reps} reps`;
  return null;
}

function formatRest(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function DayCard({ day, index }: { day: PlanDetailDay; index: number }) {
  const isRestDay = day.sessions.length === 0;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      className="flex flex-col"
    >
      <div className="flex items-end justify-between gap-3 border-b border-input pb-2">
        <div className="flex min-w-0 flex-col">
          <span className="label-caps">Day {day.day_number}</span>
          <h3 className="truncate font-display text-2xl leading-tight font-bold">{day.name}</h3>
        </div>
        {isRestDay && (
          <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <Moon className="size-3.5" />
            Rest
          </span>
        )}
      </div>

      {!isRestDay &&
        day.sessions.map((session) => (
          <div key={session.id} className="flex flex-col">
            {session.name && (
              <p className="label-caps pt-3 pb-1 text-primary">{session.name}</p>
            )}
            {session.exercises.map((ex, i) => {
              const target = setsAndReps(ex.target_sets, ex.min_reps, ex.max_reps);
              return (
                <div key={ex.id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] gap-2.5 border-b border-line py-2.5">
                  <span className="pt-0.5 text-[13px] font-bold text-subtle">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{ex.exercise?.name ?? "Exercise"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        ex.target_rir != null ? `RIR ${ex.target_rir}` : null,
                        ex.rest_seconds != null ? `rest ${formatRest(ex.rest_seconds)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {ex.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">{ex.notes}</p>}
                  </div>
                  <span className="num text-lg">{target ?? <span className="text-sm text-subtle">—</span>}</span>
                </div>
              );
            })}
          </div>
        ))}
    </motion.section>
  );
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = use(params);

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const res = await fetchPlanDetail(versionId);
        if (cancelled) return;
        setPlan(res);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFoundFlag(true);
        } else if (err instanceof ApiError && err.status === 403) {
          setError("You don't have access to this workout plan.");
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load workout plan");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [versionId]);

  if (notFoundFlag) notFound();

  if (isPending && !plan && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">{error ?? "Workout plan not found"}</p>
        <Link href="/workout" className="text-sm font-semibold text-primary hover:underline">
          Back to workouts
        </Link>
      </div>
    );
  }

  const trainingDays = plan.program_days.filter((d) => d.sessions.length > 0).length;

  return (
    <div className="flex min-h-screen flex-col pb-6">
      <div className="sticky top-0 z-30 border-b border-line bg-background/95 px-4 py-2 backdrop-blur-sm">
        <Link
          href="/workout"
          className="flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Train
        </Link>
      </div>

      <div className="flex flex-col gap-6 px-4 pt-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="label-caps text-primary">{SPLIT_TYPE_LABELS[plan.split_type] ?? plan.split_type}</span>
            <h1 className="font-display text-[34px] leading-none font-bold">{plan.program_name}</h1>
            {plan.version_name && <p className="text-[13px] text-muted-foreground">{plan.version_name}</p>}
          </div>
          <div className="grid grid-cols-3 border-y border-line">
            <div className="flex flex-col items-center gap-1 py-3">
              <span className="num text-[26px]">{plan.training_days}×</span>
              <span className="label-caps">Per week</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-line py-3">
              <span className="num text-[26px]">{plan.duration_weeks ?? "—"}</span>
              <span className="label-caps">Weeks</span>
            </div>
            <div className="flex flex-col items-center gap-1 py-3">
              <span className="num text-[26px]">{trainingDays}</span>
              <span className="label-caps">Training days</span>
            </div>
          </div>
          {plan.description && <p className="text-sm leading-relaxed text-muted-foreground">{plan.description}</p>}
        </motion.div>

        <div className="flex flex-col gap-6">
          {plan.program_days.map((day, i) => (
            <DayCard key={day.id} day={day} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
