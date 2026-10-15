"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, CloudOff, List as ListIcon, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ExerciseLogCard } from "@/components/workout/exercise-log-card";
import { RestTimer } from "@/components/workout/rest-timer";
import { AddExerciseSheet } from "@/components/workout/add-exercise-sheet";
import { AddExerciseScopeSheet, type AddExerciseScope } from "@/components/workout/add-exercise-scope-sheet";
import {
  SessionExercisesSheet,
  exerciseProgress,
  type SessionExerciseSummary,
} from "@/components/workout/session-exercises-sheet";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Button } from "@/components/ui/button";
import { useWorkoutSetQueueStore } from "@/lib/offline/workoutSetQueue";
import { flushWorkoutSetQueue } from "@/lib/offline/flushWorkoutSetQueue";
import { startDraftSession, useWorkoutDraftStore, type WorkoutDraft } from "@/lib/offline/workoutDraft";
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
  addSessionExercise,
  type WorkoutPlanAssignment,
  type ProgramDay,
  type ProgramDaySession,
  type PlanExercise,
  type WorkoutSet,
} from "@/lib/api/workout";
import type { ExerciseListItem } from "@/lib/api/exercises";
import { cn } from "@/lib/utils";

type Step =
  | "loading"
  | "no-plans"
  | "pick-assignment"
  | "pick-day"
  | "pick-session"
  | "starting"
  | "active"
  | "error";

/** The session being logged — a server session, or a local draft not yet written to the API (see workoutDraft). */
type ActiveSession = { id: string; started_at: string };

// A picked-but-untouched draft older than this is dropped instead of resumed.
const STALE_DRAFT_MS = 1000 * 60 * 60 * 12;

function hasQueuedSets(sessionId: string) {
  return useWorkoutSetQueueStore.getState().queue.some((q) => q.workoutSessionId === sessionId);
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

function PickerList<T>({
  eyebrow,
  title,
  items,
  render,
  onPick,
}: {
  eyebrow: string;
  title: string;
  items: T[];
  render: (item: T) => { title: string; subtitle?: string };
  onPick: (item: T) => void;
}) {
  return (
    <div className="flex flex-col px-4 pt-6">
      <Link href="/workout" className="mb-5 flex min-h-11 w-fit items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ChevronLeft className="size-4" />
        Back
      </Link>
      <span className="label-caps text-primary">{eyebrow}</span>
      <h1 className="mt-1 mb-5 font-display text-[32px] leading-none font-bold">{title}</h1>
      <div className="flex flex-col border-t border-line">
        {items.map((item, i) => {
          const { title: itemTitle, subtitle } = render(item);
          return (
            <motion.button
              key={i}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onPick(item)}
              className="flex min-h-16 items-center justify-between gap-3 border-b border-line py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-[22px] leading-tight font-bold">{itemTitle}</p>
                {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
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
      <h2 className="font-display text-[28px] leading-tight font-bold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      {ctaLabel && ctaHref && (
        <Button variant="light" size="xl" className="mt-6" onClick={() => router.push(ctaHref)}>
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
  // The plan day-session being trained — where "all future sessions" adds go.
  const [programDaySession, setProgramDaySession] = useState<ProgramDaySession | null>(null);

  const [workoutSession, setWorkoutSession] = useState<ActiveSession | null>(null);
  const pendingSyncCount = useWorkoutSetQueueStore((s) =>
    workoutSession ? s.pendingCountForSession(workoutSession.id) : 0,
  );
  const draftId = useWorkoutDraftStore((s) => s.draft?.id ?? null);
  // Not in the API yet — nothing has synced against this workout.
  const isDraft = !!workoutSession && workoutSession.id === draftId;
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
  // Exercise in focus — set to the first unfinished one when the session loads.
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [exercisesSheetOpen, setExercisesSheetOpen] = useState(false);

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
  const [addingExercise, setAddingExercise] = useState<AddExerciseScope | null>(null);
  // Picked in the add-exercise search, waiting on "this workout / all future sessions".
  const [exerciseToAdd, setExerciseToAdd] = useState<ExerciseListItem | null>(null);

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

  // Loads the session's exercises (and, for a server session, its logged
  // sets) and opens the logging screen.
  const enterSession = useCallback(
    async (
      assignmentArg: WorkoutPlanAssignment,
      dayArg: ProgramDay,
      session: ProgramDaySession,
      sessionPromise: Promise<ActiveSession>,
      isDraftSession: boolean,
    ) => {
      setStep("starting");
      try {
        const [ws, ex] = await Promise.all([
          sessionPromise,
          fetchSessionExercises(assignmentArg.id, dayArg.id, session.id),
        ]);
        setWorkoutSession(ws);
        setProgramDaySession(session);
        setExercises(ex);
        // Fire-and-forget — not awaited, so a slow gym connection doesn't
        // delay getting into the workout itself.
        preloadHistories(ex.map((e) => e.exercise?.id));

        const existingSets = isDraftSession ? [] : await fetchSessionSets(ws.id);
        const grouped: Record<string, WorkoutSet[]> = {};
        for (const s of existingSets) {
          (grouped[s.workout_program_exercise_id] ??= []).push(s);
        }
        setSetsByExercise(grouped);
        // Resuming mid-workout: start on the first exercise that still has
        // planned sets left. Pinned here (not re-derived on every render) so
        // finishing an exercise's last set doesn't yank the screen away.
        const firstOpen = ex.find((e) => {
          const done = (grouped[e.id] ?? []).filter((s) => s.parent_set_id == null).length;
          return e.target_sets == null || done < e.target_sets;
        });
        setSelectedExerciseId((firstOpen ?? ex[0])?.id ?? null);
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

  // Picking a day only creates a local draft — the API session is created
  // with this id and start time when the first set syncs.
  const beginDraft = useCallback(
    (assignmentArg: WorkoutPlanAssignment, dayArg: ProgramDay, session: ProgramDaySession) => {
      const draft: WorkoutDraft = {
        id: crypto.randomUUID(),
        assignmentId: assignmentArg.id,
        programDayId: dayArg.id,
        programDaySessionId: session.id,
        startedAt: new Date().toISOString(),
      };
      useWorkoutDraftStore.getState().setDraft(draft);
      return enterSession(
        assignmentArg,
        dayArg,
        session,
        Promise.resolve({ id: draft.id, started_at: draft.startedAt }),
        true,
      );
    },
    [enterSession],
  );

  // If the API resumed a different in-progress session for this draft (e.g.
  // started on another device), switch to that session's id and start time.
  useEffect(
    () =>
      useWorkoutDraftStore.subscribe((state) => {
        const started = state.started;
        if (!started || started.session.id === started.draftId) return;
        setWorkoutSession((prev) =>
          prev?.id === started.draftId
            ? { id: started.session.id, started_at: started.session.started_at }
            : prev,
        );
      }),
    [],
  );

  // Step 1: check for a workout already in progress (e.g. the app was
  // backgrounded or the page reloaded mid-workout) and jump straight back
  // into it — a server session first, else a local draft not yet synced;
  // otherwise resolve which plan we're training under as normal.
  useEffect(() => {
    let cancelled = false;

    // Restores the picker state for a plan/day/session and returns it, or
    // null if any of them no longer exists.
    async function loadPick(
      plans: WorkoutPlanAssignment[],
      assignmentId: string,
      dayId: string,
      sessionId: string,
    ) {
      const assignmentObj = plans.find((p) => p.id === assignmentId);
      if (!assignmentObj) return null;
      const dayList = await fetchProgramDays(assignmentId);
      const dayObj = dayList.find((d) => d.id === dayId);
      if (!dayObj) return null;
      const sessionList = await fetchProgramDaySessions(assignmentId, dayObj.id);
      const sessionObj = sessionList.find((s) => s.id === sessionId);
      if (!sessionObj || cancelled) return null;
      setActiveAssignments(plans);
      setAssignment(assignmentObj);
      setDays(dayList);
      setDaysLoading(false);
      setDay(dayObj);
      setSessions(sessionList);
      setSessionsLoading(false);
      return { assignmentObj, dayObj, sessionObj };
    }

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

        const draftStore = useWorkoutDraftStore.getState();
        const draft = draftStore.draft;

        if (ongoing?.program_day_id && ongoing.program_day_session_id) {
          const pick = await loadPick(plans, ongoing.assignment_id, ongoing.program_day_id, ongoing.program_day_session_id);
          if (cancelled) return;
          if (pick) {
            // The server's workout wins over an untouched local draft.
            if (draft && !hasQueuedSets(draft.id)) draftStore.clearDraft();
            await enterSession(
              pick.assignmentObj,
              pick.dayObj,
              pick.sessionObj,
              startWorkoutSession({
                assignmentId: pick.assignmentObj.id,
                programDayId: pick.dayObj.id,
                programDaySessionId: pick.sessionObj.id,
              }),
              false,
            );
            return;
          }
          pickFromAssignments(plans);
          return;
        }

        if (draft) {
          const stale = Date.now() - new Date(draft.startedAt).getTime() > STALE_DRAFT_MS;
          const pick =
            stale && !hasQueuedSets(draft.id)
              ? null
              : await loadPick(plans, draft.assignmentId, draft.programDayId, draft.programDaySessionId);
          if (cancelled) return;
          if (pick) {
            await enterSession(
              pick.assignmentObj,
              pick.dayObj,
              pick.sessionObj,
              Promise.resolve({ id: draft.id, started_at: draft.startedAt }),
              true,
            );
            return;
          }
          if (!hasQueuedSets(draft.id)) draftStore.clearDraft();
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
  }, [enterSession]);

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
          beginDraft(assignment, day, s[0]);
        } else if (s.length === 0) {
          setStep("error");
        }
      })
      .catch(() => setStep("error"))
      .finally(() => setSessionsLoading(false));
  }, [step, assignment, day, beginDraft]);

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
  // Until the first set, the workout exists only on this device.
  const canCancel = isDraft && totalSetsLogged === 0 && pendingSyncCount === 0;

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

  // Only the user's own copy of a plan can take new exercises.
  const canAddToPlan = !!assignment?.is_editable && !!programDaySession;

  function handlePickExercise(ex: ExerciseListItem) {
    if (canAddToPlan) {
      setAddExerciseOpen(false);
      setExerciseToAdd(ex);
    } else {
      handleAddExercise(ex, "session");
    }
  }

  async function handleAddExercise(ex: ExerciseListItem, scope: AddExerciseScope) {
    if (!workoutSession) return;
    setAddingExercise(scope);
    try {
      // An added exercise is stored against the session, so adding one is
      // what creates a draft workout in the API if no set has yet.
      const sessionId = isDraft ? await startDraftSession() : workoutSession.id;
      const planExercise = await addSessionExercise(
        sessionId,
        ex.id,
        scope === "plan" && programDaySession
          ? { kind: "plan", programDaySessionId: programDaySession.id }
          : { kind: "session" },
      );
      setExercises((prev) => [...prev, planExercise]);
      preloadHistories([planExercise.exercise?.id]);
      setSelectedExerciseId(planExercise.id);
      setAddExerciseOpen(false);
      setExerciseToAdd(null);
      if (scope === "plan") toast.success(`Added to ${day?.name ?? "your plan"}`);
    } catch {
      toast.error("Failed to add exercise");
    } finally {
      setAddingExercise(null);
    }
  }

  async function handleFinish() {
    if (!workoutSession) return;
    setFinishing(true);
    try {
      // Sets were logged but haven't synced the session into the API yet.
      const sessionId = isDraft ? await startDraftSession() : workoutSession.id;
      await finishWorkoutSession(sessionId);
      if (pendingSyncCount > 0) {
        toast.success("Workout finished — your sets will sync once you're back online.");
        router.push("/home");
      } else {
        router.push(`/workout/history/${sessionId}?completed=1`);
      }
    } catch {
      toast.error("Failed to finish workout");
      setFinishing(false);
    }
  }

  // Nothing logged and nothing in the API — backing out just drops the draft.
  function handleCancel() {
    useWorkoutDraftStore.getState().clearDraft();
    router.push("/workout");
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
        ctaHref="/workout"
      />
    );
  }

  if (step === "error") {
    return (
      <CenteredMessage
        title="Something went wrong"
        body="We couldn't start your workout. Please try again."
        ctaLabel="Back to workouts"
        ctaHref="/workout"
      />
    );
  }

  if (step === "pick-assignment") {
    return (
      <PickerList
        eyebrow="Start workout"
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
        eyebrow={assignment?.program_name ?? "Start workout"}
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
        eyebrow={day?.name ?? "Start workout"}
        title="Which session?"
        items={sessions}
        render={(s) => ({ title: s.name })}
        onPick={(s) => assignment && day && beginDraft(assignment, day, s)}
      />
    );
  }

  // step === "active"
  const summaries: SessionExerciseSummary[] = exercises.map((ex) => ({
    id: ex.id,
    name: ex.exercise?.name ?? "Exercise",
    done: (setsByExercise[ex.id] ?? []).filter((s) => s.parent_set_id == null).length,
    target: ex.target_sets,
    isAdhoc: ex.exercise_order == null,
  }));
  const currentExerciseId = selectedExerciseId ?? summaries[0]?.id ?? null;
  const inSessionExerciseIds = new Set(
    exercises.map((ex) => ex.exercise?.id).filter((id): id is string => !!id),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Link
            href="/home"
            aria-label="Minimise workout"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card"
          >
            <ChevronDown className="size-[18px]" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="label-caps truncate">{assignment?.program_name}</span>
            <span className="truncate font-display text-xl leading-tight font-bold">{day?.name}</span>
          </div>
          {lastSetAt && (
            <div className="flex flex-col items-center">
              <span className="num text-[17px] text-muted-foreground">{formatDuration(sinceLastSet)}</span>
              <span className="text-[9px] font-semibold tracking-[0.08em] text-subtle uppercase">Since set</span>
            </div>
          )}
          <div className="flex flex-col items-center">
            <span className="num text-xl">{formatDuration(elapsed)}</span>
            <span className="text-[9px] font-semibold tracking-[0.08em] text-subtle uppercase">Elapsed</span>
          </div>
          {canCancel ? (
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 shrink-0 rounded-full border border-input bg-card px-3.5 text-sm font-bold transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowFinishConfirm(true)}
              className="h-10 shrink-0 rounded-full border border-danger-line bg-danger-surface px-3.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/15"
            >
              Finish
            </button>
          )}
        </div>

        {pendingSyncCount > 0 && (
          <div className="flex items-center justify-between gap-2 bg-warning-surface px-4 py-1.5 text-[13px] font-semibold text-warning">
            <span className="flex items-center gap-1.5">
              <CloudOff className="size-3.5" />
              {pendingSyncCount} set{pendingSyncCount !== 1 ? "s" : ""} not yet synced
            </span>
            <button
              type="button"
              onClick={() => flushWorkoutSetQueue()}
              className="flex min-h-8 items-center gap-1 font-bold hover:underline"
            >
              <RefreshCw className="size-3" />
              Sync now
            </button>
          </div>
        )}

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
      </div>

      <div className="flex flex-col gap-[18px] px-4 pt-3.5 pb-32">
        <div className="flex items-center gap-2">
          <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-0.5 scrollbar-none">
            {summaries.map((ex, i) => {
              const selected = ex.id === currentExerciseId;
              const complete = ex.target != null && ex.done >= ex.target;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedExerciseId(ex.id)}
                  aria-label={`${ex.name}, ${ex.done}${ex.target != null ? ` of ${ex.target}` : ""} sets${selected ? ", current" : ""}`}
                  aria-current={selected ? "true" : undefined}
                  className={cn("shrink-0 rounded-full", selected && "bg-track-primary")}
                >
                  <ProgressRing
                    value={exerciseProgress(ex)}
                    size={44}
                    stroke={4}
                    tone={complete ? "success" : "primary"}

                  >
                    <span className={cn("text-[15px] font-bold", selected ? "text-foreground" : "text-muted-foreground")}>
                      {i + 1}
                    </span>
                  </ProgressRing>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setExercisesSheetOpen(true)}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold"
          >
            All
            <ListIcon className="size-3.5" />
          </button>
        </div>

        {workoutSession &&
          exercises.map((ex, i) => (
            // Every card stays mounted (only the current one is shown) so each
            // keeps its in-progress form, edits and drop rows when switching.
            <div key={ex.id} hidden={ex.id !== currentExerciseId}>
              <ExerciseLogCard
                exercise={ex}
                position={i + 1}
                total={exercises.length}
                workoutSessionId={workoutSession.id}
                initialSets={setsByExercise[ex.id] ?? []}
                history={ex.exercise ? historyCache[ex.exercise.id] : undefined}
                onSetLogged={(set, dropSets, restSeconds) => handleSetLogged(ex.id, set, dropSets, restSeconds)}
              />
            </div>
          ))}

        {exercises.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">This session has no exercises yet.</p>
            <Button variant="light" size="xl" onClick={() => setAddExerciseOpen(true)}>
              <Plus />
              Add exercise
            </Button>
          </div>
        )}
      </div>

      <SessionExercisesSheet
        open={exercisesSheetOpen}
        title={day?.name ?? "Exercises"}
        exercises={summaries}
        selectedId={currentExerciseId}
        onSelect={(id) => {
          setSelectedExerciseId(id);
          setExercisesSheetOpen(false);
          window.scrollTo({ top: 0 });
        }}
        onAddExercise={() => {
          setExercisesSheetOpen(false);
          setAddExerciseOpen(true);
        }}
        onClose={() => setExercisesSheetOpen(false)}
      />

      <AddExerciseSheet
        open={addExerciseOpen}
        busy={addingExercise != null}
        inSessionExerciseIds={inSessionExerciseIds}
        description={
          canAddToPlan
            ? "Log it in this workout only, or add it to your plan."
            : undefined
        }
        onClose={() => setAddExerciseOpen(false)}
        onPick={handlePickExercise}
      />

      <AddExerciseScopeSheet
        exerciseName={exerciseToAdd?.name ?? null}
        dayName={day?.name ?? "this day"}
        busyScope={addingExercise}
        onPick={(scope) => exerciseToAdd && handleAddExercise(exerciseToAdd, scope)}
        onBack={() => {
          setExerciseToAdd(null);
          setAddExerciseOpen(true);
        }}
        onClose={() => setExerciseToAdd(null)}
      />

      <AnimatePresence>
        {showFinishConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
            onClick={() => setShowFinishConfirm(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="finish-title"
              className="w-full max-w-md rounded-t-3xl border-t border-input bg-card px-4 pt-2.5 pb-6"
            >
              <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-input" />
              <h2 id="finish-title" className="font-display text-2xl font-bold">
                Finish workout?
              </h2>
              <div className="mt-4 grid grid-cols-3 border-y border-line">
                <div className="flex flex-col items-center gap-1 py-3">
                  <span className="num text-[26px]">{formatDuration(elapsed)}</span>
                  <span className="label-caps">Duration</span>
                </div>
                <div className="flex flex-col items-center gap-1 border-x border-line py-3">
                  <span className="num text-[26px]">{totalSetsLogged}</span>
                  <span className="label-caps">Sets</span>
                </div>
                <div className="flex flex-col items-center gap-1 py-3">
                  <span className="num text-[26px]">
                    {summaries.filter((s) => s.done > 0).length}/{summaries.length}
                  </span>
                  <span className="label-caps">Exercises</span>
                </div>
              </div>
              {pendingSyncCount > 0 && (
                <p className="mt-3 text-[13px] text-warning">
                  {pendingSyncCount} set{pendingSyncCount !== 1 ? "s" : ""} still syncing — they&apos;ll upload
                  once you&apos;re back online.
                </p>
              )}
              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="h-13 flex-1 rounded-xl text-base font-semibold"
                  onClick={() => setShowFinishConfirm(false)}
                  disabled={finishing}
                >
                  Resume
                </Button>
                <Button variant="light" size="xl" className="flex-1" onClick={handleFinish} disabled={finishing}>
                  {finishing && <Loader2 className="animate-spin" />}
                  Finish
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
