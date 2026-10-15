"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  fetchMyWorkoutPlans,
  fetchPublicWorkoutPlans,
  selectWorkoutPlan,
  deselectWorkoutPlan,
  reactivateWorkoutPlan,
  type WorkoutPlanAssignment,
  type PublicWorkoutPlan,
} from "@/lib/api/workout";

function AssignmentCard({
  assignment,
  busy,
  onDeactivate,
  onReactivate,
}: {
  assignment: WorkoutPlanAssignment;
  busy: boolean;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => router.push(`/workout/plans/${assignment.workout_program_version_id}`)}
      className={cn(
        "cursor-pointer rounded-2xl border bg-card p-[18px] transition-colors",
        assignment.is_active ? "border-border hover:border-input" : "border-dashed border-input opacity-80",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="label-caps text-primary">
              {assignment.split_type} · {assignment.training_days}× / week
            </span>
            <h3 className="mt-1 truncate font-display text-[28px] leading-none font-bold">
              {assignment.program_name}
            </h3>
            {assignment.version_name && (
              <p className="mt-1 text-[13px] text-muted-foreground">{assignment.version_name}</p>
            )}
          </div>
          {!assignment.is_active && (
            <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Inactive
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {assignment.is_active ? (
            <>
              <Link href="/workout/active" className="flex-1">
                <Button variant="light" size="xl" className="w-full">
                  <Play className="fill-current" />
                  Start
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-13 rounded-xl px-4 text-sm font-semibold"
                disabled={busy}
                onClick={onDeactivate}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="h-12 w-full rounded-xl text-sm font-semibold"
              disabled={busy}
              onClick={onReactivate}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Reactivate
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PublicPlanCard({
  plan,
  selected,
  busy,
  onSelect,
}: {
  plan: PublicWorkoutPlan;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => router.push(`/workout/plans/${plan.workout_program_version_id}`)}
      className="cursor-pointer rounded-2xl border border-border bg-card p-[18px] transition-colors hover:border-input"
    >
      <div className="grid grid-cols-3 border-b border-line pb-3">
        <div className="flex flex-col">
          <span className="num text-[26px]">{plan.training_days}×</span>
          <span className="label-caps text-[10px]">Per week</span>
        </div>
        <div className="flex flex-col">
          <span className="num text-[26px]">{plan.duration_weeks}</span>
          <span className="label-caps text-[10px]">Weeks</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-display text-[26px] leading-none font-bold text-primary">
            {plan.split_type}
          </span>
          <span className="label-caps text-[10px]">Split</span>
        </div>
      </div>
      <h3 className="mt-3 font-display text-[26px] leading-tight font-bold">{plan.name}</h3>
      {plan.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
      )}

      <Button
        className="mt-4 h-12 w-full rounded-xl font-display text-base font-bold tracking-[0.08em] uppercase"
        variant={selected ? "outline" : "default"}
        disabled={busy || selected}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {selected ? "In your plans" : "Add to my plans"}
      </Button>
    </motion.div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-input px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default function WorkoutPage() {
  const [myPlans, setMyPlans] = useState<WorkoutPlanAssignment[]>([]);
  const [publicPlans, setPublicPlans] = useState<PublicWorkoutPlan[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refreshMine() {
    setLoadingMine(true);
    fetchMyWorkoutPlans()
      .then(setMyPlans)
      .catch(() => toast.error("Failed to load your plans"))
      .finally(() => setLoadingMine(false));
  }

  useEffect(() => {
    // Both loading flags already start `true`, so the initial fetch just
    // needs to clear them — `refreshMine()` (used after select/deactivate)
    // additionally sets loadingMine back to true for a manual re-fetch.
    fetchMyWorkoutPlans()
      .then(setMyPlans)
      .catch(() => toast.error("Failed to load your plans"))
      .finally(() => setLoadingMine(false));
    fetchPublicWorkoutPlans()
      .then(setPublicPlans)
      .catch(() => toast.error("Failed to load public plans"))
      .finally(() => setLoadingPublic(false));
  }, []);

  async function handleSelect(workoutProgramId: string) {
    setBusyId(workoutProgramId);
    try {
      await selectWorkoutPlan(workoutProgramId);
      toast.success("Plan added to your list");
      refreshMine();
    } catch {
      toast.error("Failed to select plan");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(assignmentId: string) {
    setBusyId(assignmentId);
    try {
      await reactivateWorkoutPlan(assignmentId);
      toast.success("Plan reactivated");
      refreshMine();
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeactivate(assignmentId: string) {
    setBusyId(assignmentId);
    try {
      await deselectWorkoutPlan(assignmentId);
      toast.success("Plan removed from your active list");
      refreshMine();
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = myPlans.filter((p) => p.is_active).length;
  // My Plans holds the user's own copies; Browse lists the public originals.
  const selectedProgramIds = new Set(
    myPlans.filter((p) => p.is_active).map((p) => p.source_workout_program_id ?? p.workout_program_id),
  );

  return (
    <div className="flex flex-col px-4">
      <PageHeader
        title="Train"
        subtitle="Workout plans"
        action={
          <Link href="/workout/history">
            <Button variant="outline" className="h-10 rounded-full px-3.5 text-[13px] font-semibold">
              <History className="size-3.5" />
              History
            </Button>
          </Link>
        }
      />

      <Tabs defaultValue="mine" className="flex-1">
        <TabsList className="mb-5 h-11! w-full">
          <TabsTrigger value="mine" className="flex-1">
            My Plans
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex-1">
            Browse Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          {activeCount > 0 && (
            <Link href="/workout/active" className="mb-4 block">
              <Button variant="light" size="xl" className="w-full">
                <Play className="fill-current" />
                Start workout
              </Button>
            </Link>
          )}

          {loadingMine ? (
            <div className="flex flex-col gap-3">
              <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
              <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
            </div>
          ) : myPlans.length === 0 ? (
            <EmptyState>
              You haven&apos;t selected any workout plans yet. Browse public plans to
              get started.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {myPlans.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  busy={busyId === assignment.id}
                  onDeactivate={() => handleDeactivate(assignment.id)}
                  onReactivate={() => handleReactivate(assignment.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse">
          {loadingPublic ? (
            <div className="flex flex-col gap-3">
              <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
              <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
            </div>
          ) : publicPlans.length === 0 ? (
            <EmptyState>No public workout plans are available right now.</EmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {publicPlans.map((plan) => (
                <PublicPlanCard
                  key={plan.workout_program_id}
                  plan={plan}
                  selected={selectedProgramIds.has(plan.workout_program_id)}
                  busy={busyId === plan.workout_program_id}
                  onSelect={() => handleSelect(plan.workout_program_id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
