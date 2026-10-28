"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CircleAlert, CornerDownRight, Loader2 } from "lucide-react";
import { ExerciseHistoryPanel } from "@/components/workout/exercise-history-panel";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Button } from "@/components/ui/button";
import {
  fetchRecentPRs,
  fetchSessionSets,
  fetchWorkoutSessionDetail,
  fetchWorkoutSessions,
  type PersonalRecord,
  type WorkoutSessionDetail,
  type WorkoutSet,
} from "@/lib/api/workout";
import { groupSetsWithDropsets, formatContraction } from "@/lib/workout-sets";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
import { cn } from "@/lib/utils";

/** How far back to look for the previous run of the same day, and for PRs set during this session. */
const PREVIOUS_SESSION_LOOKBACK = 30;
const PR_LOOKBACK = 50;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeOfDay(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startIso: string, endIso: string | null) {
  if (!endIso) return "—";
  const minutes = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m}m`;
}

/** "Weight" is the added weight (e.g. plates); "tool weight" is the bar/equipment itself. */
function formatLoad(weight: number | null, toolWeight: number | null) {
  if (weight == null && toolWeight == null) return "BW";
  if (toolWeight != null && toolWeight > 0) {
    return `${weight ?? 0}+${toolWeight}kg`;
  }
  return `${weight ?? 0}kg`;
}

/** Same definition the API uses for weekly volume: (weight + tool) × reps, warmups excluded, drop sets included. */
function sessionVolume(sets: WorkoutSet[]) {
  return sets.reduce(
    (sum, s) => (s.is_warmup ? sum : sum + ((s.weight ?? 0) + (s.tool_weight ?? 0)) * (s.reps ?? 0)),
    0,
  );
}

function formatVolume(kg: number) {
  if (kg >= 1000) return { value: (kg / 1000).toFixed(2), unit: "t" };
  return { value: `${Math.round(kg)}`, unit: "kg" };
}

interface Summary {
  volume: number;
  /** Volume of the previous completed run of the same plan day/session; null if there isn't one. */
  previousVolume: number | null;
  workingSets: number;
  reps: number;
  prs: PersonalRecord[];
}

async function loadSummary(session: WorkoutSessionDetail): Promise<Summary> {
  const [setsResult, listResult, prsResult] = await Promise.allSettled([
    fetchSessionSets(session.id),
    fetchWorkoutSessions({ limit: PREVIOUS_SESSION_LOOKBACK }),
    fetchRecentPRs(PR_LOOKBACK),
  ]);

  const sets = setsResult.status === "fulfilled" ? setsResult.value : [];

  let previousVolume: number | null = null;
  if (listResult.status === "fulfilled") {
    const previous = listResult.value.data.find(
      (s) =>
        s.id !== session.id &&
        s.completed_at != null &&
        s.plan_name === session.plan_name &&
        s.day_name === session.day_name &&
        s.session_name === session.session_name &&
        new Date(s.started_at) < new Date(session.started_at),
    );
    if (previous) {
      try {
        previousVolume = sessionVolume(await fetchSessionSets(previous.id));
      } catch {
        previousVolume = null;
      }
    }
  }

  const from = new Date(session.started_at).getTime();
  const to = session.completed_at ? new Date(session.completed_at).getTime() : Date.now();
  const prs =
    prsResult.status === "fulfilled"
      ? prsResult.value.filter((pr) => {
          const t = new Date(pr.achieved_at).getTime();
          return t >= from && t <= to;
        })
      : [];

  return {
    volume: sessionVolume(sets),
    previousVolume,
    workingSets: sets.filter((s) => s.parent_set_id == null && !s.is_warmup).length,
    reps: sets.reduce((n, s) => n + (s.is_warmup ? 0 : (s.reps ?? 0)), 0),
    prs,
  };
}

function DetailContent({ sessionId, justCompleted }: { sessionId: string; justCompleted: boolean }) {
  const detailQuery = useCachedQuery<WorkoutSessionDetail>(`history/session/${sessionId}`, () =>
    fetchWorkoutSessionDetail(sessionId),
  );
  const session = detailQuery.data ?? null;
  // The summary needs the session, so it starts once that is known (saved or fresh).
  const summary =
    useCachedQuery<Summary>(session ? `history/session/${sessionId}/summary` : null, () => loadSummary(session!))
      .data ?? null;
  const loading = detailQuery.loading;
  // Saved data stays on screen when a refresh fails (e.g. offline).
  const error = !!detailQuery.error && !session;

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
        <p className="font-display text-2xl font-bold">Workout not found</p>
        <Link href="/workout/history" className="mt-3 text-sm font-semibold text-primary">
          Back to history
        </Link>
      </div>
    );
  }

  const title = `${session.day_name ?? "Workout"}${session.session_name ? ` · ${session.session_name}` : ""}`;
  const volume = summary ? formatVolume(summary.volume) : null;
  const ratio =
    summary == null
      ? 0
      : summary.previousVolume && summary.previousVolume > 0
        ? summary.volume / summary.previousVolume
        : summary.volume > 0
          ? 1
          : 0;
  const comparison =
    summary == null
      ? null
      : summary.previousVolume && summary.previousVolume > 0
        ? `${Math.round((summary.volume / summary.previousVolume) * 100)}% of last ${session.day_name ?? "time"}`
        : "First logged run of this day";
  const beatLastTime = summary?.previousVolume != null && summary.volume >= summary.previousVolume;
  // Ring overflows past 100% in green — the part beyond last time's volume.
  const overflow = Math.max(0, ratio - 1);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-10">
      {justCompleted ? (
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="label-caps text-success">Workout complete</span>
          <h1 className="font-display text-[28px] leading-tight font-bold">{title}</h1>
          <span className="text-[13px] text-muted-foreground">{session.plan_name}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Link
            href="/workout/history"
            className="flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            History
          </Link>
          <div className="flex flex-col gap-1">
            <span className="label-caps">
              {session.plan_name} · {formatDate(session.started_at)}
            </span>
            <h1 className="font-display text-[32px] leading-none font-bold">{title}</h1>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <div className="relative">
          <ProgressRing
            value={Math.min(ratio, 1)}
            size={justCompleted ? 230 : 180}
            stroke={justCompleted ? 14 : 12}
            tone="primary"
            label={volume ? `Session volume ${volume.value}${volume.unit}${comparison ? `, ${comparison}` : ""}` : "Loading volume"}
          >
            <span className="label-caps">Volume</span>
            {volume ? (
              <span className={cn("num", justCompleted ? "text-[64px]" : "text-[48px]")}>
                {volume.value}
                <span className="text-[24px] text-muted-foreground">{volume.unit}</span>
              </span>
            ) : (
              <Loader2 className="my-3 size-6 animate-spin text-muted-foreground" />
            )}
            {comparison && (
              <span
                className={cn(
                  "max-w-[150px] text-center text-[13px] font-semibold",
                  beatLastTime ? "text-success" : "text-muted-foreground",
                )}
              >
                {comparison}
              </span>
            )}
          </ProgressRing>
          {overflow > 0 && (
            <ProgressRing
              value={overflow}
              size={justCompleted ? 230 : 180}
              stroke={justCompleted ? 14 : 12}
              tone="success"
              className="pointer-events-none absolute inset-0 [&_circle:first-child]:stroke-transparent"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-line">
        <div className="flex flex-col items-center gap-1 py-3.5">
          <span className="num text-[26px]">{formatDuration(session.started_at, session.completed_at)}</span>
          <span className="label-caps">Duration</span>
        </div>
        <div className="flex flex-col items-center gap-1 border-x border-line py-3.5">
          <span className="num text-[26px]">{summary ? summary.workingSets : "—"}</span>
          <span className="label-caps">Sets</span>
        </div>
        <div className="flex flex-col items-center gap-1 py-3.5">
          <span className="num text-[26px]">{summary ? summary.reps : "—"}</span>
          <span className="label-caps">Reps</span>
        </div>
      </div>

      {summary && summary.prs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="label-caps">New personal records</h2>
          {summary.prs.map((pr) => (
            <Link
              key={pr.exercise_id}
              href={`/exercises/${pr.exercise_id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-success-line bg-success-surface px-3.5 py-3"
            >
              <span className="truncate text-[15px] font-semibold">{pr.exercise_name}</span>
              <span className="num shrink-0 text-[22px]">
                {Math.round(pr.load * 10) / 10}
                <span className="text-[13px] text-muted-foreground"> × {pr.reps}</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="label-caps">Exercises</h2>
        {session.exercises.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No sets were logged in this workout.</p>
        ) : (
          session.exercises.map((ex, i) => (
            <motion.div
              key={ex.workout_program_exercise_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <h3 className="font-display text-[22px] leading-tight font-bold">
                {ex.exercise_name}
                {ex.is_adhoc && <span className="ml-2 align-middle text-xs font-semibold text-muted-foreground">added</span>}
              </h3>

              <div className="flex flex-col">
                {groupSetsWithDropsets(ex.sets).map(({ main: s, drops }, si, all) => (
                  <div
                    key={s.id}
                    className={cn("flex flex-col gap-1 py-2", si < all.length - 1 && "border-b border-line")}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 shrink-0 font-bold text-success">{s.set_order}</span>
                      <span className="num text-lg">
                        {formatLoad(s.weight, s.tool_weight)} × {s.reps ?? "—"}
                      </span>
                      {s.rir != null && <span className="text-[13px] text-muted-foreground">RIR {s.rir}</span>}
                      <span className="ml-auto shrink-0 text-xs text-subtle tabular-nums">
                        {formatTimeOfDay(s.created_at)}
                      </span>
                    </div>
                    {s.contraction != null && (
                      <p className="pl-[30px] text-[13px] text-muted-foreground">{formatContraction(s.contraction)}</p>
                    )}
                    {s.effort && <p className="pl-[30px] text-[13px] text-muted-foreground">{s.effort}</p>}
                    {s.discomfort_notes && (
                      <p className="flex items-start gap-1.5 pl-[30px] text-[13px] text-warning">
                        <CircleAlert className="mt-0.5 size-3 shrink-0" aria-label="Discomfort" />
                        {s.discomfort_notes}
                      </p>
                    )}
                    {drops.map((d) => (
                      <div key={d.id} className="flex flex-col gap-0.5 pl-[30px]">
                        <div className="flex items-center gap-2.5">
                          <CornerDownRight className="size-3.5 shrink-0 text-subtle" />
                          <span className="text-[13px] text-muted-foreground">Drop {d.drop_order}</span>
                          <span className="num text-base">
                            {formatLoad(d.weight, d.tool_weight)} × {d.reps ?? "—"}
                          </span>
                          {d.rir != null && <span className="text-[13px] text-muted-foreground">RIR {d.rir}</span>}
                        </div>
                        {d.effort && <p className="pl-6 text-xs text-muted-foreground">{d.effort}</p>}
                        {d.discomfort_notes && <p className="pl-6 text-xs text-warning">{d.discomfort_notes}</p>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <ExerciseHistoryPanel exerciseId={ex.exercise_id} beforeSessionId={session.id} />
            </motion.div>
          ))
        )}
      </section>

      {justCompleted && (
        <Link href="/home" className="block">
          <Button variant="light" size="xl" className="w-full">
            Done
          </Button>
        </Link>
      )}
    </div>
  );
}

export default function WorkoutHistoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ completed?: string }>;
}) {
  const { sessionId } = use(params);
  const { completed } = use(searchParams);
  return <DetailContent sessionId={sessionId} justCompleted={completed === "1"} />;
}
