"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleDot, Clock3, Flag, Pencil, TrendingUp } from "lucide-react";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Button } from "@/components/ui/button";
import { GoalTrajectoryChart } from "@/components/weight/goal-trajectory-chart";
import { WeightGoalDrawer, describeWeightGoal } from "@/components/profile/weight-goal-drawer";
import { EndWeightGoalDrawer } from "@/components/profile/end-weight-goal-drawer";
import { fetchWeightRange, type WeightEntry, type WeightMovingAverage } from "@/lib/api/weight";
import {
  fetchWeightGoal,
  fetchWeightGoalHistory,
  type WeightGoal,
  type WeightGoalHistoryEntry,
  type WeightGoalState,
  type WeightPaceStatus,
} from "@/lib/api/profile";
import { cn } from "@/lib/utils";

/** Shared with the Home widget, so both read the same saved copy. */
export const WEIGHT_GOAL_QUERY_KEY = "profile/goal";

function fmt(w: number) {
  return w % 1 === 0 ? `${w}` : w.toFixed(1);
}

function round1(w: number) {
  return Math.round(w * 10) / 10;
}

function formatDate(iso: string, withYear = false) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function fmtSigned(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(round1(n)))}`;
}

type Tone = "success" | "warning" | "neutral";

/**
 * The verdict on the measured trend, worded to inform, never to scold:
 * weight moves in waves, and a slow week is information, not failure.
 */
export function paceVerdict(goal: WeightGoal, units: string): { tone: Tone; title: string; body: string } {
  const t = goal.trajectory;
  const actual = t.actual_weekly_change;
  const trendText = actual != null ? `${fmtSigned(actual)} ${units}/wk` : null;
  const plan = goal.pace_weekly_pct != null && goal.start_weight != null
    ? `${fmtSigned((goal.start_weight * goal.pace_weekly_pct) / 100)} ${units}/wk`
    : null;
  const vs = trendText && plan ? `Trend ${trendText} against a plan of ${plan}.` : trendText ? `Trend ${trendText}.` : "";
  const verdicts: Record<WeightPaceStatus, { tone: Tone; title: string; body: string }> = {
    goal_reached: { tone: "success", title: "Target reached", body: "You made it. Mark the goal complete when you're ready." },
    on_track: { tone: "success", title: goal.goal === "maintain" ? "Holding steady" : "On track", body: `${vs} Keep doing what you're doing.` },
    behind: { tone: "neutral", title: "A bit slower than planned", body: `${vs} Progress is still progress. A small tweak or simply more time both work.` },
    too_fast: { tone: "warning", title: "Ahead of plan", body: `${vs} Faster isn't always better. Make sure you're eating enough to train and recover well.` },
    wrong_direction: { tone: "neutral", title: "Trend has turned lately", body: `${vs} Water, salt and stress swing the scale. Give it another week before changing anything.` },
    drifting_up: { tone: "neutral", title: "Drifting up a little", body: `${vs} Easy to nudge back if you want to.` },
    drifting_down: { tone: "neutral", title: "Drifting down a little", body: `${vs} Easy to nudge back if you want to.` },
    not_enough_data: { tone: "neutral", title: "Building your trend", body: "A few more weigh-ins (4 over 10+ days) and your trend line appears." },
    no_goal: { tone: "neutral", title: "", body: "" },
  };
  return verdicts[t.pace_status];
}

const TONE_CLASS: Record<Tone, string> = {
  success: "border-success-line bg-success-surface",
  warning: "border-warning-line bg-warning-surface",
  neutral: "border-border bg-background",
};

const TONE_ICON: Record<Tone, React.ReactNode> = {
  success: <Check className="size-4 text-success" aria-hidden />,
  warning: <TrendingUp className="size-4 text-warning" aria-hidden />,
  neutral: <CircleDot className="size-4 text-muted-foreground" aria-hidden />,
};

/** Current weight against the plan for today, e.g. "0.6 kg ahead of plan". */
export function planGapText(goal: WeightGoal, current: number | null, units: string): string | null {
  const planned = goal.trajectory.planned_weight_today;
  if (planned == null || current == null || goal.goal === "maintain") return null;
  const gap = current - planned;
  if (Math.abs(gap) < 0.2) return "Right on plan";
  const ahead = goal.goal === "lose" ? gap < 0 : gap > 0;
  return `${fmt(round1(Math.abs(gap)))} ${units} ${ahead ? "ahead of" : "behind"} plan`;
}

export function WeightGoalCard({ refreshKey }: { refreshKey?: number }) {
  const goalQuery = useCachedQuery<WeightGoalState>(WEIGHT_GOAL_QUERY_KEY, fetchWeightGoal);
  const historyQuery = useCachedQuery<WeightGoalHistoryEntry[]>("profile/goal/history", fetchWeightGoalHistory);
  const state = goalQuery.data;
  const goal = state?.goal ?? null;

  // Plain values, not `goal!.start_date` inside the fetcher: the React Compiler
  // memoizes the fetcher on what it reads, and would read goal.start_date
  // during render, while the goal is still loading (null).
  const startDate = goal?.start_date ?? null;
  const today = state?.today ?? null;
  const rangeKey = startDate && today ? `body/goal-range/${startDate}/${today}/${refreshKey ?? 0}` : null;
  const rangeQuery = useCachedQuery<{ entries: WeightEntry[]; averages: WeightMovingAverage[] }>(rangeKey, async () => {
    const data = await fetchWeightRange(startDate!, today!);
    return { entries: data.weight_entries, averages: data.weight_moving_averages };
  });

  // A new or edited weigh-in changes the goal's numbers too.
  const lastRefreshKey = useRef(refreshKey);
  const refreshGoal = goalQuery.refresh;
  useEffect(() => {
    if (lastRefreshKey.current === refreshKey) return;
    lastRefreshKey.current = refreshKey;
    void refreshGoal();
  }, [refreshKey, refreshGoal]);

  const [editOpen, setEditOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  if (!state) {
    return goalQuery.loading ? <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" /> : null;
  }

  const units = state.weight_units;
  const current = state.current_weight?.weight ?? null;
  const history = historyQuery.data ?? [];

  function refreshAll() {
    void goalQuery.refresh();
    void historyQuery.refresh();
  }

  return (
    <>
      {goal ? (
        <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby="goal-heading">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="label-caps text-primary">Current goal</p>
              <h3 id="goal-heading" className="mt-1 text-[15px] font-semibold leading-snug">
                {describeWeightGoal(state)}
              </h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Since {formatDate(goal.start_date)}
                {goal.start_weight != null && ` from ${fmt(round1(goal.start_weight))} ${units}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label="Edit goal"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-input text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
          </div>

          <GoalSummary goal={goal} current={current} units={units} />

          {rangeQuery.data && (
            <div className="mt-4">
              <GoalTrajectoryChart
                goal={goal}
                entries={rangeQuery.data.entries}
                averages={rangeQuery.data.averages}
                today={state.today}
                units={units}
              />
            </div>
          )}

          <GoalVerdict goal={goal} units={units} />

          <div className="mt-4 flex flex-col gap-2">
            {goal.can_complete && (
              <Button type="button" variant="light" size="xl" onClick={() => setEndOpen(true)}>
                <Flag /> Mark complete
              </Button>
            )}
            <button
              type="button"
              onClick={() => setEndOpen(true)}
              className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {goal.can_complete ? "Other ways to end it" : "End this goal"}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          disabled={!state.has_preferences}
          className="flex w-full flex-col items-start gap-1 rounded-2xl border border-dashed border-input p-4 text-left transition-colors hover:bg-card disabled:opacity-60"
        >
          <span className="text-[15px] font-semibold">
            {history.length > 0 ? "Ready for your next goal?" : "Set a body-weight goal"}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {state.has_preferences
              ? "Cut, bulk or maintain. See your plan next to your real trend."
              : "Save your units and height in Profile settings first."}
          </span>
        </button>
      )}

      {history.length > 0 && <GoalHistory history={history} state={state} />}

      <WeightGoalDrawer
        open={editOpen}
        state={state}
        onClose={() => setEditOpen(false)}
        onSaved={() => refreshAll()}
        onEndRequest={() => {
          setEditOpen(false);
          setEndOpen(true);
        }}
      />
      <EndWeightGoalDrawer
        open={endOpen}
        state={state}
        onClose={() => setEndOpen(false)}
        onEnded={() => refreshAll()}
      />
    </>
  );
}

function GoalSummary({ goal, current, units }: { goal: WeightGoal; current: number | null; units: string }) {
  const progress = goal.trajectory.progress;
  const gap = planGapText(goal, current, units);
  const projected = goal.trajectory.projected_date;
  return (
    <div className="mt-4 flex items-center gap-4">
      {progress != null && (
        <ProgressRing
          value={progress}
          size={64}
          stroke={6}
          tone={goal.target_reached ? "success" : "primary"}
          label={`${Math.round(progress * 100)}% of the way to the target`}
        >
          <span className="num text-[17px]">{Math.round(progress * 100)}%</span>
        </ProgressRing>
      )}
      <div className="min-w-0 flex-1">
        <p className="num text-[30px] leading-none">
          {current != null ? fmt(round1(current)) : "—"}
          <span className="ml-1 text-sm text-muted-foreground">{units} now</span>
        </p>
        {gap && <p className="mt-1 text-[13px] font-semibold">{gap}</p>}
        {goal.goal !== "maintain" && (
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
            <Clock3 className="size-3" aria-hidden />
            {projected
              ? `At this trend: ${goal.target_weight != null ? `${fmt(goal.target_weight)} ${units}` : "target"} by ${formatDate(projected, true)}`
              : goal.goal_date
                ? `Plan: ${formatDate(goal.goal_date, true)}`
                : null}
          </p>
        )}
      </div>
    </div>
  );
}

function GoalVerdict({ goal, units }: { goal: WeightGoal; units: string }) {
  const verdict = paceVerdict(goal, units);
  if (!verdict.title) return null;
  return (
    <div className={cn("mt-4 flex gap-2.5 rounded-xl border p-3", TONE_CLASS[verdict.tone])}>
      <span className="mt-0.5">{TONE_ICON[verdict.tone]}</span>
      <div>
        <p className="text-[14px] font-semibold">{verdict.title}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{verdict.body}</p>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<WeightGoalHistoryEntry["status"], string> = {
  completed: "Completed",
  finished_early: "Finished early",
  cancelled: "Cancelled",
};

const GOAL_NAME: Record<WeightGoal["goal"], string> = { lose: "Cut", gain: "Bulk", maintain: "Maintain" };

function GoalHistory({ history, state }: { history: WeightGoalHistoryEntry[]; state: WeightGoalState }) {
  const units = state.weight_units;
  const reasonLabel = (entry: WeightGoalHistoryEntry) => {
    if (!entry.end_reason || entry.status === "completed") return null;
    return state.end_reasons[entry.status]?.find((r) => r.key === entry.end_reason)?.label ?? null;
  };
  return (
    <section aria-labelledby="goal-history-heading">
      <h3 id="goal-history-heading" className="label-caps mb-1">
        Past goals ({history.length})
      </h3>
      <ul className="flex flex-col border-t border-line">
        {history.map((entry) => {
          const preset = state.presets.find((p) => p.key === entry.preset);
          const name = preset?.label ?? GOAL_NAME[entry.goal];
          const reason = reasonLabel(entry);
          const moved = entry.change != null && entry.goal !== "maintain"
            ? (entry.goal === "lose" ? -entry.change : entry.change)
            : null;
          return (
            <li key={entry.id} className="flex flex-col gap-1 border-b border-line py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-semibold">
                  {name}
                  {entry.target_weight != null && (
                    <span className="font-normal text-muted-foreground"> to {fmt(entry.target_weight)} {units}</span>
                  )}
                </p>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 text-[12px] font-semibold",
                    entry.status === "completed" ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {entry.status === "completed" && <Check className="size-3" aria-hidden />}
                  {STATUS_LABEL[entry.status]}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground">
                {formatDate(entry.start_date)} – {formatDate(entry.end_date, true)}
                {entry.weeks != null && ` · ${entry.weeks} wk`}
                {entry.start_weight != null && entry.end_weight != null && (
                  <>
                    {" · "}
                    <span className="num text-[13px] text-foreground">
                      {fmt(round1(entry.start_weight))} → {fmt(round1(entry.end_weight))} {units}
                    </span>
                  </>
                )}
              </p>
              {moved != null && moved >= 0.1 && (
                <p className="text-[12px] text-success">{fmt(round1(moved))} {units} toward the target</p>
              )}
              {(reason || entry.end_note) && (
                <p className="text-[12px] text-muted-foreground">
                  {reason}
                  {reason && entry.end_note && " · "}
                  {entry.end_note && <span className="italic">&ldquo;{entry.end_note}&rdquo;</span>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
