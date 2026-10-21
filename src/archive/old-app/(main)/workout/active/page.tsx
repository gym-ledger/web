"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, CloudOff, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ExerciseLogCard } from "@/archive/old-ui/components/workout/exercise-log-card";
import { RestTimer } from "@/archive/old-ui/components/workout/rest-timer";
import { AddExerciseSheet } from "@/archive/old-ui/components/workout/add-exercise-sheet";
import { Button } from "@/archive/old-ui/components/ui/button";
import { useWorkoutSetQueueStore } from "@/lib/offline/workoutSetQueue";
import { flushWorkoutSetQueue } from "@/lib/offline/flushWorkoutSetQueue";
import {
  preloadExerciseHistories,
  type ExerciseHistoryCache,
} from "@/lib/workout/exercise-history-cache";
import {
  fetchActiveWorkoutPlans,
  fetchProgramDays,
  fetchProgramDaySessions,
  fetchSessionExercises,
  fetchSessionSets,
  startWorkoutSession,
  finishWorkoutSession,
  fetchOngoingWorkoutSession,
  addAdhocExercise,
  type WorkoutPlanAssignment,
  type ProgramDay,
  type ProgramDaySession,
  type PlanExercise,
  type WorkoutSession,
  type WorkoutSet,
} from "@/lib/api/workout";
import type { ExerciseListItem } from "@/lib/api/exercises";

type Step =
  | "loading"
  | "no-plans"
  | "pick-assignment"
  | "pick-day"
  | "pick-session"
  | "starting"
  | "active"
  | "error";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PickerList<T>({
  title,
  items,
  render,
  onPick,
}: {
  title: string;
  items: T[];
  render: (item: T) => { title: string; subtitle?: string };
  onPick: (item: T) => void;
}) {
  return (
    <div className="flex flex-col px-4 pt-6">
      <h1 className="text-xl font-bold text-foreground mb-4">{title}</h1>
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => {
          const { title: itemTitle, subtitle } = render(item);
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onPick(item)}
              className="flex items-center justify-between rounded-2xl bg-card p-4 text-left ring-1 ring-foreground/10 hover:bg-secondary/50 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{itemTitle}</p>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function CenteredMessage({
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      {ctaLabel && ctaHref && (
        <Button className="mt-5 rounded-xl" onClick={() => router.push(ctaHref)}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");

  const [activeAssignments, setActiveAssignments] = useState<WorkoutPlanAssignment[]>([]);
  const [assignment, setAssignment] = useState<WorkoutPlanAssignment | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [daysLoading, setDaysLoading] = useState(true);
  const [day, setDay] = useState<ProgramDay | null>(null);
  const [sessions, setSessions] = useState<ProgramDaySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const pendingSyncCount = useWorkoutSetQueueStore((s) =>
    workoutSession ? s.pendingCountForSession(workoutSession.id) : 0,
  );
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, WorkoutSet[]>>({});
  // Previous-performance data for each exercise, fetched in the background as
  // soon as the session's exercise list is known so "prefill from last time"
  // and "previous performance" resolve instantly from cache instead of
  // pinging the API on tap — gyms often have poor connectivity.
  const [historyCache, setHistoryCache] = useState<ExerciseHistoryCache>({});
  const historyCacheRef = useRef<ExerciseHistoryCache>({});
  useEffect(() => {
    historyCacheRef.current = historyCache;
  }, [historyCache]);

  const preloadHistories = useCallback((exerciseIds: (string | undefined)[]) => {
    const toLoad = [...new Set(exerciseIds.filter((id): id is string => !!id))].filter(
      (id) => !historyCacheRef.current[id],
    );
    if (toLoad.length === 0) return;
    setHistoryCache((prev) => {
      const next = { ...prev };
      for (const id of toLoad) next[id] = { sessions: [], loading: true };
      return next;
    });
    preloadExerciseHistories(toLoad, (exerciseId, entry) => {
      setHistoryCache((prev) => ({ ...prev, [exerciseId]: entry }));
    });
  }, []);
  // Only one exercise card expanded at a time; expanding one collapses whichever was open.
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  const [elapsed, setElapsed] = useState(0);
  // ISO timestamp of the most recently logged set (any exercise), or null
  // until the first set of the session. Drives the "since last set" counter.
  const [lastSetAt, setLastSetAt] = useState<string | null>(null);
  const [sinceLastSet, setSinceLastSet] = useState(0);
  const [restVisible, setRestVisible] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  // Bumped on every logged set so RestTimer always remounts (fresh countdown)
  // instead of reusing an already-running instance stuck on its old value.
  const [restKey, setRestKey] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);

  function pickFromAssignments(plans: WorkoutPlanAssignment[]) {
    setActiveAssignments(plans);
    if (plans.length === 0) {
      setStep("no-plans");
    } else if (plans.length === 1) {
      setAssignment(plans[0]);
      setStep("pick-day");
    } else {
      setStep("pick-assignment");
    }
  }

  const startSession = useCallback(
    async (assignmentArg: WorkoutPlanAssignment, dayArg: ProgramDay, session: ProgramDaySession) => {
      setStep("starting");
      try {
        const [ws, ex] = await Promise.all([
          startWorkoutSession({
            assignmentId: assignmentArg.id,
            programDayId: dayArg.id,
            programDaySessionId: session.id,
          }),
          fetchSessionExercises(assignmentArg.id, dayArg.id, session.id),
        ]);
        setWorkoutSession(ws);
        setExercises(ex);
        // Fire-and-forget — not awaited, so a slow gym connection doesn't
        // delay getting into the workout itself.
        preloadHistories(ex.map((e) => e.exercise?.id));

        const existingSets = await fetchSessionSets(ws.id);
        const grouped: Record<string, WorkoutSet[]> = {};
        for (const s of existingSets) {
          (grouped[s.workout_program_exercise_id] ??= []).push(s);
        }
        setSetsByExercise(grouped);
        if (existingSets.length > 0) {
          const latest = existingSets.reduce((max, s) =>
            new Date(s.created_at) > new Date(max.created_at) ? s : max,
          );
          setLastSetAt(latest.created_at);
        }
        setStep("active");
      } catch {
        setStep("error");
      }
    },
    [preloadHistories],
  );

  // Step 1: check for a workout already in progress (e.g. the app was
  // backgrounded or the page reloaded mid-workout) and jump straight back
  // into it; otherwise resolve which plan we're training under as normal.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // `plans` doesn't depend on `ongoing`'s result — fetched alongside it
        // (not after) instead of separately in each branch below, cutting a
        // round-trip off both the resume-in-progress and fresh-start paths.
        const [ongoing, plans] = await Promise.all([
          fetchOngoingWorkoutSession(),
          fetchActiveWorkoutPlans(),
        ]);
        if (cancelled) return;

        if (ongoing?.program_day_id && ongoing.program_day_session_id) {
          const dayList = await fetchProgramDays(ongoing.assignment_id);
          if (cancelled) return;
          const assignmentObj = plans.find((p) => p.id === ongoing.assignment_id);
          const dayObj = dayList.find((d) => d.id === ongoing.program_day_id);
          if (assignmentObj && dayObj) {
            const sessionList = await fetchProgramDaySessions(ongoing.assignment_id, dayObj.id);
            if (cancelled) return;
            const sessionObj = sessionList.find((s) => s.id === ongoing.program_day_session_id);
            if (sessionObj) {
              setActiveAssignments(plans);
              setAssignment(assignmentObj);
              setDays(dayList);
              setDaysLoading(false);
              setDay(dayObj);
              setSessions(sessionList);
              setSessionsLoading(false);
              await startSession(assignmentObj, dayObj, sessionObj);
              return;
            }
          }
          pickFromAssignments(plans);
          return;
        }

        pickFromAssignments(plans);
      } catch {
        if (!cancelled) setStep("error");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [startSession]);

  // Step 2: once a plan is chosen, load its days.
  useEffect(() => {
    if (step !== "pick-day" || !assignment) return;
    fetchProgramDays(assignment.id)
      .then(setDays)
      .catch(() => setStep("error"))
      .finally(() => setDaysLoading(false));
  }, [step, assignment]);

  function handlePickAssignment(a: WorkoutPlanAssignment) {
    setAssignment(a);
    setStep("pick-day");
  }

  function handlePickDay(d: ProgramDay) {
    setDay(d);
    setStep("pick-session");
  }

  // Step 3: once a day is chosen, load its sessions. Auto-advance if there's
  // only one (mirrors the plan auto-pick rule).
  useEffect(() => {
    if (step !== "pick-session" || !assignment || !day) return;
    fetchProgramDaySessions(assignment.id, day.id)
      .then((s) => {
        setSessions(s);
        if (s.length === 1) {
          startSession(assignment, day, s[0]);
        } else if (s.length === 0) {
          setStep("error");
        }
      })
      .catch(() => setStep("error"))
      .finally(() => setSessionsLoading(false));
  }, [step, assignment, day, startSession]);

  // Elapsed timer while a workout is active — computed from the session's
  // real `started_at` rather than counting up from 0, so a resumed workout
  // (reload, or coming back from another screen) shows correct elapsed time
  // immediately instead of restarting. A visibilitychange listener forces an
  // immediate recompute the moment the app returns to the foreground
  // (locking the phone / switching apps can throttle or pause setInterval
  // entirely), instead of waiting for the next scheduled tick.
  useEffect(() => {
    if (step !== "active" || !workoutSession) return;
    const startedAtMs = new Date(workoutSession.started_at).getTime();
    function tick() {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    }
    tick();
    const id = setInterval(tick, 1000);
    function handleVisibility() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [step, workoutSession]);

  // "Since last set" — same real-timestamp-based approach as the elapsed
  // timer above, so it's equally unaffected by backgrounding. Not rendered
  // at all until `lastSetAt` is set (i.e. at least one set logged this
  // session, including ones from before a reload/resume).
  useEffect(() => {
    if (step !== "active" || !lastSetAt) return;
    const lastSetAtMs = new Date(lastSetAt).getTime();
    function tick() {
      setSinceLastSet(Math.max(0, Math.floor((Date.now() - lastSetAtMs) / 1000)));
    }
    tick();
    const id = setInterval(tick, 1000);
    function handleVisibility() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [step, lastSetAt]);

  const totalSetsLogged = Object.values(setsByExercise).reduce(
    (total, sets) => total + sets.length,
    0,
  );

  function handleToggleExpand(exerciseId: string) {
    setExpandedExerciseId((prev) => (prev === exerciseId ? null : exerciseId));
  }

  function handleSetLogged(
    exerciseId: string,
    set: WorkoutSet,
    dropSets: WorkoutSet[],
    restSeconds: number,
  ) {
    setSetsByExercise((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), set, ...dropSets],
    }));
    const latest = dropSets.reduce((max, s) => (new Date(s.created_at) > new Date(max.created_at) ? s : max), set);
    setLastSetAt(latest.created_at);
    setRestDuration(restSeconds);
    setRestVisible(true);
    setRestKey((k) => k + 1);
  }

  async function handleAddExercise(ex: ExerciseListItem) {
    if (!workoutSession) return;
    setAddingExercise(true);
    try {
      const planExercise = await addAdhocExercise(workoutSession.id, ex.id);
      setExercises((prev) => [...prev, planExercise]);
      preloadHistories([planExercise.exercise?.id]);
      setExpandedExerciseId(planExercise.id);
      setAddExerciseOpen(false);
    } catch {
      toast.error("Failed to add exercise");
    } finally {
      setAddingExercise(false);
    }
  }

  async function handleFinish() {
    if (!workoutSession) return;
    setFinishing(true);
    try {
      await finishWorkoutSession(workoutSession.id);
      toast.success("Workout finished — nice work!");
      router.push("/old/home");
    } catch {
      toast.error("Failed to finish workout");
      setFinishing(false);
    }
  }

  if (step === "loading" || step === "starting") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === "no-plans") {
    return (
      <CenteredMessage
        title="No workout plan selected"
        body="Select a workout plan before starting a workout."
        ctaLabel="Browse plans"
        ctaHref="/old/workout"
      />
    );
  }

  if (step === "error") {
    return (
      <CenteredMessage
        title="Something went wrong"
        body="We couldn't start your workout. Please try again."
        ctaLabel="Back to workouts"
        ctaHref="/old/workout"
      />
    );
  }

  if (step === "pick-assignment") {
    return (
      <PickerList
        title="Which plan are you training?"
        items={activeAssignments}
        render={(a) => ({
          title: a.program_name,
          subtitle: `${a.split_type} · ${a.training_days} days/week`,
        })}
        onPick={handlePickAssignment}
      />
    );
  }

  if (step === "pick-day") {
    if (daysLoading) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <PickerList
        title="Which day are you doing?"
        items={days}
        render={(d) => ({ title: d.name, subtitle: `Day ${d.day_number}` })}
        onPick={handlePickDay}
      />
    );
  }

  if (step === "pick-session") {
    if (sessionsLoading) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <PickerList
        title="Which session?"
        items={sessions}
        render={(s) => ({ title: s.name })}
        onPick={(s) => assignment && day && startSession(assignment, day, s)}
      />
    );
  }

  // step === "active"
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider truncate">
              {assignment?.program_name}
            </p>
            <h1 className="text-base font-bold text-foreground leading-tight truncate">
              {day?.name}
            </h1>
          </div>

          {lastSetAt && (
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold tabular-nums text-muted-foreground">
                {formatDuration(sinceLastSet)}
              </span>
              <span className="text-[9px] text-muted-foreground/70 uppercase tracking-wider whitespace-nowrap">
                since last set
              </span>
            </div>
          )}

          <div className="flex flex-col items-center">
            <span className="text-xl font-black tabular-nums text-foreground">
              {formatDuration(elapsed)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              elapsed
            </span>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowFinishConfirm(true)}
            className="rounded-xl font-semibold"
          >
            Finish
          </Button>
        </div>
      </div>

      {pendingSyncCount > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-amber-500/10 px-4 py-1.5 text-xs text-amber-600">
          <span className="flex items-center gap-1.5">
            <CloudOff className="size-3.5" />
            {pendingSyncCount} set{pendingSyncCount !== 1 ? "s" : ""} not yet synced
          </span>
          <button
            type="button"
            onClick={() => flushWorkoutSetQueue()}
            className="flex items-center gap-1 font-semibold hover:underline"
          >
            <RefreshCw className="size-3" />
            Sync now
          </button>
        </div>
      )}

      <div className="flex items-center justify-around border-b border-border bg-card px-4 py-2">
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {totalSetsLogged}
          </span>
          <span className="text-[10px] text-muted-foreground">sets logged</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {exercises.length}
          </span>
          <span className="text-[10px] text-muted-foreground">exercises</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 pb-32">
        {workoutSession &&
          exercises.map((ex, i) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <ExerciseLogCard
                exercise={ex}
                workoutSessionId={workoutSession.id}
                initialSets={setsByExercise[ex.id] ?? []}
                history={ex.exercise ? historyCache[ex.exercise.id] : undefined}
                isExpanded={expandedExerciseId === ex.id}
                onToggleExpand={() => handleToggleExpand(ex.id)}
                onSetLogged={(set, dropSets, restSeconds) =>
                  handleSetLogged(ex.id, set, dropSets, restSeconds)
                }
              />
            </motion.div>
          ))}

        <button
          type="button"
          onClick={() => setAddExerciseOpen(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="size-4" />
          Add exercise
        </button>
      </div>

      <AddExerciseSheet
        open={addExerciseOpen}
        busy={addingExercise}
        onClose={() => setAddExerciseOpen(false)}
        onPick={handleAddExercise}
      />

      <AnimatePresence>
        {restVisible && (
          <RestTimer
            key={restKey}
            initialSeconds={restDuration}
            onSkip={() => setRestVisible(false)}
            onFinish={() => setRestVisible(false)}
          />
        )}
      </AnimatePresence>

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
                You&apos;ve logged {totalSetsLogged} set{totalSetsLogged !== 1 ? "s" : ""}{" "}
                in {formatDuration(elapsed)}.
              </p>

              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setShowFinishConfirm(false)}
                  disabled={finishing}
                >
                  Resume
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-12 rounded-xl font-semibold"
                  onClick={handleFinish}
                  disabled={finishing}
                >
                  {finishing && <Loader2 className="size-4 animate-spin" />}
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
