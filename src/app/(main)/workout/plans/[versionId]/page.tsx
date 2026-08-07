"use client";

import { use, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Moon } from "lucide-react";
import { fetchPlanDetail, type PlanDetail, type PlanDetailDay } from "@/lib/api/workout";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const SPLIT_TYPE_LABELS: Record<string, string> = {
  ppl: "Push / Pull / Legs",
  "upper-lower": "Upper / Lower",
  "full-body": "Full Body",
  custom: "Custom",
};

function repRange(min: number | null, max: number | null) {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}-${max} reps`;
  return `${min ?? max} reps`;
}

function DayCard({ day, index }: { day: PlanDetailDay; index: number }) {
  const isRestDay = day.sessions.length === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      className="rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Day {day.day_number}
          </p>
          <h3 className="text-sm font-bold text-foreground">{day.name}</h3>
        </div>
        {isRestDay && (
          <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Moon className="size-3.5" />
            Rest day
          </span>
        )}
      </div>

      {!isRestDay && (
        <div className="flex flex-col divide-y divide-border/60">
          {day.sessions.map((session) => (
            <div key={session.id} className="px-4 py-3">
              {session.name && (
                <p className="mb-2 text-xs font-semibold text-primary uppercase tracking-wide">
                  {session.name}
                </p>
              )}
              <div className="flex flex-col gap-2.5">
                {session.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {ex.exercise?.name ?? "Exercise"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[
                          ex.target_sets != null ? `${ex.target_sets} sets` : null,
                          repRange(ex.min_reps, ex.max_reps),
                          ex.target_rir != null ? `RIR ${ex.target_rir}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No targets set"}
                      </p>
                      {ex.notes && (
                        <p className="mt-0.5 text-xs text-muted-foreground italic">{ex.notes}</p>
                      )}
                    </div>
                    {ex.rest_seconds != null && (
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {ex.rest_seconds}s rest
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
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
        <Link href="/workout" className="text-sm font-medium text-primary hover:underline">
          Back to workouts
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-6">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/workout">
            <button className="flex size-9 items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
              <ArrowLeft className="size-4 text-foreground" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{plan.program_name}</h1>
            {plan.version_name && (
              <p className="text-xs text-muted-foreground truncate">{plan.version_name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card ring-1 ring-foreground/10 p-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {SPLIT_TYPE_LABELS[plan.split_type] ?? plan.split_type}
            </span>
            <span className="text-xs text-muted-foreground">
              {plan.training_days}× / week
              {plan.duration_weeks ? ` · ${plan.duration_weeks}wk` : ""}
            </span>
          </div>
          {plan.description && (
            <p className={cn("mt-2 text-sm text-muted-foreground leading-relaxed")}>
              {plan.description}
            </p>
          )}
        </motion.div>

        <div className="flex flex-col gap-3">
          {plan.program_days.map((day, i) => (
            <DayCard key={day.id} day={day} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
