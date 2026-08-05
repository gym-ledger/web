"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  fetchMyWorkoutPlans,
  fetchPublicWorkoutPlans,
  selectWorkoutPlan,
  deselectWorkoutPlan,
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden"
    >
      <div className={`h-1 ${assignment.is_active ? "bg-primary" : "bg-border"}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {assignment.split_type}
              </span>
              <span className="text-xs text-muted-foreground">
                {assignment.training_days}× / week
              </span>
            </div>
            <h3 className="mt-1.5 text-base font-bold text-foreground truncate">
              {assignment.program_name}
            </h3>
            {assignment.version_name && (
              <p className="mt-0.5 text-xs text-muted-foreground">{assignment.version_name}</p>
            )}
          </div>
          {!assignment.is_active && (
            <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
              Inactive
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {assignment.is_active ? (
            <>
              <Link href="/workout/active" className="flex-1">
                <Button className="w-full h-10 rounded-xl font-semibold gap-2" size="sm">
                  <Play className="size-3.5 fill-current" />
                  Start Workout
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl"
                disabled={busy}
                onClick={onDeactivate}
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Remove"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl font-semibold"
              size="sm"
              disabled={busy}
              onClick={onReactivate}
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card ring-1 ring-foreground/10 p-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          {plan.split_type}
        </span>
        <span className="text-xs text-muted-foreground">
          {plan.training_days}× / week · {plan.duration_weeks}wk
        </span>
      </div>
      <h3 className="mt-1.5 text-base font-bold text-foreground">{plan.name}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{plan.description}</p>

      <Button
        className="mt-4 w-full h-10 rounded-xl font-semibold"
        size="sm"
        variant={selected ? "outline" : "default"}
        disabled={busy || selected}
        onClick={onSelect}
      >
        {busy && <Loader2 className="size-3.5 animate-spin" />}
        {selected ? "Selected" : "Select plan"}
      </Button>
    </motion.div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-10 text-center">
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
  const selectedProgramIds = new Set(
    myPlans.filter((p) => p.is_active).map((p) => p.workout_program_id),
  );

  return (
    <div className="flex flex-col px-4 pt-4">
      <PageHeader
        title="Workouts"
        action={
          <Link href="/workout/history">
            <Button variant="outline" size="sm">
              <History className="size-3.5" />
              History
            </Button>
          </Link>
        }
      />

      <Tabs defaultValue="mine" className="flex-1">
        <TabsList className="w-full mb-5">
          <TabsTrigger value="mine" className="flex-1">
            My Plans
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex-1">
            Browse Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          {activeCount > 0 && (
            <Link href="/workout/active" className="block mb-4">
              <Button className="w-full h-11 rounded-xl font-semibold gap-2">
                <Play className="size-4 fill-current" />
                Start Workout
              </Button>
            </Link>
          )}

          {loadingMine ? (
            <div className="flex flex-col gap-3">
              <div className="h-32 rounded-2xl bg-card ring-1 ring-foreground/10 animate-pulse" />
              <div className="h-32 rounded-2xl bg-card ring-1 ring-foreground/10 animate-pulse" />
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
                  onReactivate={() => handleSelect(assignment.workout_program_id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse">
          {loadingPublic ? (
            <div className="flex flex-col gap-3">
              <div className="h-40 rounded-2xl bg-card ring-1 ring-foreground/10 animate-pulse" />
              <div className="h-40 rounded-2xl bg-card ring-1 ring-foreground/10 animate-pulse" />
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
