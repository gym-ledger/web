"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ExerciseLogCard } from "@/components/workout/exercise-log-card";
import { RestTimer } from "@/components/workout/rest-timer";
import { Button } from "@/components/ui/button";
import {
  fetchActiveWorkoutPlans,
  fetchProgramDays,
  fetchProgramDaySessions,
  fetchSessionExercises,
  fetchSessionSets,
  startWorkoutSession,
  finishWorkoutSession,
  type WorkoutPlanAssignment,
  type ProgramDay,
  type ProgramDaySession,
  type PlanExercise,
  type WorkoutSession,
  type WorkoutSet,
} from "@/lib/api/workout";

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
  const [day, setDay] = useState<ProgramDay | null>(null);
  const [sessions, setSessions] = useState<ProgramDaySession[]>([]);

  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, WorkoutSet[]>>({});
  // Only one exercise card expanded at a time; expanding one collapses whichever was open.
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [restVisible, setRestVisible] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  // Bumped on every logged set so RestTimer always remounts (fresh countdown)
  // instead of reusing an already-running instance stuck on its old value.
  const [restKey, setRestKey] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Step 1: resolve which plan we're training under.
  useEffect(() => {
    fetchActiveWorkoutPlans()
      .then((plans) => {
        setActiveAssignments(plans);
        if (plans.length === 0) {
          setStep("no-plans");
        } else if (plans.length === 1) {
          setAssignment(plans[0]);
          setStep("pick-day");
        } else {
          setStep("pick-assignment");
        }
      })
      .catch(() => setStep("error"));
  }, []);

  // Step 2: once a plan is chosen, load its days.
  useEffect(() => {
    if (step !== "pick-day" || !assignment) return;
    fetchProgramDays(assignment.id)
      .then(setDays)
      .catch(() => setStep("error"));
  }, [step, assignment]);

  function handlePickAssignment(a: WorkoutPlanAssignment) {
    setAssignment(a);
    setStep("pick-day");
  }

  function handlePickDay(d: ProgramDay) {
    setDay(d);
    setStep("pick-session");
  }

  const startSession = useCallback(
    async (session: ProgramDaySession) => {
      if (!assignment || !day) return;
      setStep("starting");
      try {
        const [ws, ex] = await Promise.all([
          startWorkoutSession({
            assignmentId: assignment.id,
            programDayId: day.id,
            programDaySessionId: session.id,
          }),
          fetchSessionExercises(assignment.id, day.id, session.id),
        ]);
        setWorkoutSession(ws);
        setExercises(ex);

        const existingSets = await fetchSessionSets(ws.id);
        const grouped: Record<string, WorkoutSet[]> = {};
        for (const s of existingSets) {
          (grouped[s.workout_program_exercise_id] ??= []).push(s);
        }
        setSetsByExercise(grouped);
        setStep("active");
      } catch {
        setStep("error");
      }
    },
    [assignment, day],
  );

  // Step 3: once a day is chosen, load its sessions. Auto-advance if there's
  // only one (mirrors the plan auto-pick rule).
  useEffect(() => {
    if (step !== "pick-session" || !assignment || !day) return;
    fetchProgramDaySessions(assignment.id, day.id)
      .then((s) => {
        setSessions(s);
        if (s.length === 1) {
          startSession(s[0]);
        } else if (s.length === 0) {
          setStep("error");
        }
      })
      .catch(() => setStep("error"));
  }, [step, assignment, day, startSession]);

  // Elapsed timer while a workout is active.
  useEffect(() => {
    if (step !== "active") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [step]);

  const totalSetsLogged = Object.values(setsByExercise).reduce(
    (total, sets) => total + sets.length,
    0,
  );

  function handleToggleExpand(exerciseId: string) {
    setExpandedExerciseId((prev) => (prev === exerciseId ? null : exerciseId));
  }

  function handleSetLogged(exerciseId: string, set: WorkoutSet, restSeconds: number) {
    setSetsByExercise((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), set],
    }));
    setRestDuration(restSeconds);
    setRestVisible(true);
    setRestKey((k) => k + 1);
  }

  async function handleFinish() {
    if (!workoutSession) return;
    setFinishing(true);
    try {
      await finishWorkoutSession(workoutSession.id);
      toast.success("Workout finished — nice work!");
      router.push("/home");
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
    return (
      <PickerList
        title="Which session?"
        items={sessions}
        render={(s) => ({ title: s.name })}
        onPick={startSession}
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
                isExpanded={expandedExerciseId === ex.id}
                onToggleExpand={() => handleToggleExpand(ex.id)}
                onSetLogged={(set, restSeconds) => handleSetLogged(ex.id, set, restSeconds)}
              />
            </motion.div>
          ))}
      </div>

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
