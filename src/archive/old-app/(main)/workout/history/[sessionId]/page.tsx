"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ExerciseHistoryPanel } from "@/archive/old-ui/components/workout/exercise-history-panel";
import {
  fetchWorkoutSessionDetail,
  type WorkoutSessionDetail,
} from "@/lib/api/workout";
import { groupSetsWithDropsets } from "@/lib/workout-sets";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeOfDay(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(startIso: string, endIso: string | null) {
  if (!endIso) return "In progress";
  const minutes = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
  );
  return `${minutes}min`;
}

/** "Weight" is the added weight (e.g. plates); "tool weight" is the bar/equipment itself. */
function formatLoad(weight: number | null, toolWeight: number | null) {
  if (weight == null && toolWeight == null) return "BW";
  if (toolWeight != null && toolWeight > 0) {
    return `${weight ?? 0}+${toolWeight}kg`;
  }
  return `${weight ?? 0}kg`;
}

function DetailContent({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<WorkoutSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchWorkoutSessionDetail(sessionId)
      .then(setSession)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-foreground">Workout not found</p>
        <Link href="/old/workout/history" className="mt-3 text-sm text-primary">
          Back to history
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-4 pb-8">
      <Link
        href="/old/workout/history"
        className="mb-3 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Workout history
      </Link>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {session.plan_name}
        </p>
        <h1 className="text-xl font-bold text-foreground">
          {session.day_name ?? "Workout"}
          {session.session_name ? ` · ${session.session_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(session.started_at)} · {formatDuration(session.started_at, session.completed_at)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {session.exercises.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No sets were logged in this workout.
          </p>
        ) : (
          session.exercises.map((ex, i) => (
            <motion.div
              key={ex.workout_program_exercise_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <h3 className="text-base font-bold text-foreground">{ex.exercise_name}</h3>

              <div className="mt-2 flex flex-col gap-1.5">
                {groupSetsWithDropsets(ex.sets).map(({ main: s, drops }) => (
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
                      </span>
                    </div>
                    {(s.effort || s.discomfort_notes) && (
                      <p className="pl-7 text-xs text-muted-foreground">
                        {[s.effort, s.discomfort_notes].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {drops.map((d) => (
                      <div key={d.id} className="flex flex-col gap-0.5 pl-7">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">↳ Drop {d.drop_order}</span>
                          <span className="tabular-nums text-foreground">
                            {formatLoad(d.weight, d.tool_weight)} × {d.reps ?? "—"}
                            {d.rir != null && (
                              <span className="text-muted-foreground"> · RIR {d.rir}</span>
                            )}
                          </span>
                          <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                            {formatTimeOfDay(d.created_at)}
                          </span>
                        </div>
                        {(d.effort || d.discomfort_notes) && (
                          <p className="pl-6 text-[11px] text-muted-foreground">
                            {[d.effort, d.discomfort_notes].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <ExerciseHistoryPanel exerciseId={ex.exercise_id} beforeSessionId={session.id} />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default function WorkoutHistoryDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  return <DetailContent sessionId={sessionId} />;
}
