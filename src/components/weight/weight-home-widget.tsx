"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { Sparkline } from "@/components/progress/mini-chart";
import { fetchWeightForDate, WeightEntry } from "@/lib/api/weight";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
import { fetchWeightGoal, type WeightGoalState } from "@/lib/api/profile";
import { WEIGHT_GOAL_QUERY_KEY, paceVerdict, planGapText } from "@/components/weight/weight-goal-card";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function subDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function fmtWeight(w: number) {
  return w % 1 === 0 ? `${w}` : w.toFixed(1);
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-sm text-muted-foreground">—</span>;
  const abs = Math.abs(delta).toFixed(1);
  if (delta < 0)
    return (
      <span className="flex items-center gap-0.5 text-sm font-semibold text-success">
        <TrendingDown className="size-3" />
        {abs} kg
      </span>
    );
  if (delta > 0)
    return (
      <span className="flex items-center gap-0.5 text-sm font-semibold text-warning">
        <TrendingUp className="size-3" />
        {abs} kg
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-sm font-semibold text-muted-foreground">
      <Minus className="size-3" />
      0 kg
    </span>
  );
}

/** One line on the active goal, e.g. "On track · 0.4 kg ahead of plan". */
function goalStatusLine(state: WeightGoalState | undefined): { title: string; detail: string | null } | null {
  const goal = state?.goal;
  if (!state || !goal) return null;
  if (goal.can_complete && goal.goal !== "maintain") {
    return { title: goal.target_reached ? "Target reached" : "Goal date reached", detail: "mark it complete in Progress" };
  }
  const verdict = paceVerdict(goal, state.weight_units);
  return {
    title: verdict.title || "Goal set",
    detail: planGapText(goal, state.current_weight?.weight ?? null, state.weight_units),
  };
}

export function WeightHomeWidget() {
  const router = useRouter();
  const today = todayISO();
  const { data, loading } = useCachedQuery<WeightEntry[]>(`home/weight/${today}`, () =>
    fetchWeightForDate(today).then((d) => d.weight_entries),
  );
  const entries = data ?? [];
  const goalState = useCachedQuery<WeightGoalState>(WEIGHT_GOAL_QUERY_KEY, fetchWeightGoal).data;
  const goalLine = goalStatusLine(goalState);

  const sorted = [...entries].sort((a, b) => a.day.localeCompare(b.day));
  const latest = sorted[sorted.length - 1] ?? null;
  const sevenDaysAgo = subDays(7);
  const thirtyDaysAgo = subDays(30);

  // Find closest entry at or before 7 days ago
  const before7 = sorted.filter((e) => e.day <= sevenDaysAgo).slice(-1)[0] ?? null;
  const before30 = sorted.filter((e) => e.day <= thirtyDaysAgo).slice(-1)[0] ?? null;

  const delta7 = latest && before7 ? latest.weight - before7.weight : null;
  const delta30 = latest && before30 ? latest.weight - before30.weight : null;

  // Last 7 days for sparkline
  const last7Entries = sorted.filter((e) => e.day >= sevenDaysAgo);
  const sparkValues = last7Entries.map((e) => e.weight);

  function handleClick() {
    router.push("/progress?tab=body");
  }

  if (loading) {
    return <div className="h-[104px] animate-pulse rounded-2xl border border-border bg-card" />;
  }

  if (entries.length === 0) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleClick}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-input p-4 text-left transition-colors hover:bg-card"
      >
        <div>
          <p className="text-[15px] font-semibold">Track your body weight</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Log your first entry to see the trend.</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/60"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="num text-[34px]">
            {fmtWeight(latest!.weight)}
            <span className="ml-1 text-base text-muted-foreground">kg</span>
          </p>
          <div className="mt-2 flex gap-5">
            <div>
              <p className="label-caps text-[10px]">7 days</p>
              <DeltaBadge delta={delta7} />
            </div>
            <div>
              <p className="label-caps text-[10px]">30 days</p>
              <DeltaBadge delta={delta30} />
            </div>
          </div>
        </div>

        {sparkValues.length >= 2 && <Sparkline data={sparkValues} width={110} height={48} />}
      </div>
      {goalLine && (
        <p className="mt-3 border-t border-line pt-2.5 text-[13px]">
          <span className="font-semibold">{goalLine.title}</span>
          {goalLine.detail && <span className="text-muted-foreground"> · {goalLine.detail}</span>}
        </p>
      )}
    </motion.button>
  );
}
