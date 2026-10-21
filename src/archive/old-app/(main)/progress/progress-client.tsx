"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { TrendingUp, Dumbbell, Clock, Target, Trophy, Search, X, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/archive/old-ui/components/ui/tabs";
import { Input } from "@/archive/old-ui/components/ui/input";
import { PageHeader } from "@/archive/old-ui/components/shared/page-header";
import { LineChart, BarChart } from "@/archive/old-ui/components/progress/mini-chart";
import { BodyTab } from "@/archive/old-ui/components/weight/body-tab";
import { groupSetsWithDropsets } from "@/lib/workout-sets";
import {
  fetchProgressOverview,
  fetchRecentPRs,
  fetchExerciseHistory,
  type ProgressOverview,
  type PersonalRecord,
  type ExerciseHistorySession,
} from "@/lib/api/workout";

const ALL_PRS_LIMIT = 300;

// Code-split out the body-muscles SVG library (only needed once the Volume
// tab is actually opened) instead of shipping it in the initial /progress bundle.
const MuscleBodyMap = dynamic(
  () => import("@/archive/old-ui/components/progress/muscle-body-map").then((mod) => mod.MuscleBodyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center rounded-2xl bg-card p-4 ring-1 ring-foreground/10 py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-3.5 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-black text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

interface Props {
  defaultTab: string;
}

function formatWeekLabel(weekStart: string) {
  return new Date(`${weekStart}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatSignedPct(pct: number | null) {
  if (pct == null) return null;
  const rounded = Math.round(pct);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Overview tab's single spotlight card: whichever exercise the user most recently set a PR in. */
function LatestPrCard({ pr, units }: { pr: PersonalRecord; units: "kg" | "lbs" }) {
  const [history, setHistory] = useState<ExerciseHistorySession[] | null>(null);

  useEffect(() => {
    fetchExerciseHistory(pr.exercise_id, 12)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [pr.exercise_id]);

  const chartData = (history ? [...history].reverse() : [])
    .map((session) => {
      const mains = groupSetsWithDropsets(session.sets).map((g) => g.main);
      const maxLoad = mains.reduce((m, s) => Math.max(m, (s.weight ?? 0) + (s.tool_weight ?? 0)), 0);
      return { label: formatShortDate(session.started_at), value: maxLoad };
    })
    .filter((d) => d.value > 0);

  const delta =
    chartData.length >= 2 ? chartData[chartData.length - 1].value - chartData[0].value : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-foreground truncate">{pr.exercise_name}</h3>
        <span className="text-xs text-primary font-medium">Latest PR</span>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-2xl font-black text-foreground tabular-nums">{pr.load}</span>
        <span className="text-sm text-muted-foreground mb-0.5">
          {units} × {pr.reps}
        </span>
        {delta != null && delta > 0 && (
          <span className="text-xs font-medium text-primary bg-primary/10 rounded-md px-1.5 py-0.5 mb-0.5">
            +{Math.round(delta * 10) / 10}
            {units}
          </span>
        )}
      </div>
      {chartData.length >= 2 ? (
        <LineChart data={chartData} height={90} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Achieved {formatShortDate(pr.achieved_at)} — log it again to start a trend line
        </p>
      )}
    </motion.div>
  );
}

export function ProgressPageClient({ defaultTab }: Props) {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[] | null>(null);
  const [prSearch, setPrSearch] = useState("");

  useEffect(() => {
    fetchProgressOverview()
      .then(setOverview)
      .catch(() => {});
    fetchRecentPRs(ALL_PRS_LIMIT)
      .then(setPrs)
      .catch(() => {});
  }, []);

  const filteredPrs = useMemo(() => {
    if (!prs) return null;
    const q = prSearch.trim().toLowerCase();
    if (!q) return prs;
    return prs.filter((pr) => pr.exercise_name.toLowerCase().includes(q));
  }, [prs, prSearch]);

  const volumeData =
    overview?.weekly_volume_series.map((d) => ({
      label: formatWeekLabel(d.week_start),
      value: d.volume,
    })) ?? [];

  const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return `${v}`;
  };
  const units = overview?.weight_units ?? "kg";
  const thisWeekVolume = overview?.weekly_volume_series.at(-1)?.volume ?? 0;
  const weekOverWeekLabel = formatSignedPct(overview?.week_over_week_change_pct ?? null);
  const growthRateLabel = formatSignedPct(overview?.growth_rate_pct ?? null);

  return (
    <div className="flex flex-col px-4 pt-4">
      <PageHeader title="Progress" />

      <Tabs defaultValue={defaultTab} className="flex-1">
        <TabsList className="w-full mb-5 overflow-x-auto scrollbar-none">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="strength" className="flex-1">Strength</TabsTrigger>
          <TabsTrigger value="volume" className="flex-1">Volume</TabsTrigger>
          <TabsTrigger value="body" className="flex-1">Body</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Total volume"
                value={overview ? `${formatVolume(overview.total_volume)}${units}` : "—"}
                icon={Dumbbell}
                delay={0.05}
              />
              <StatCard
                label="Workouts"
                value={overview ? `${overview.total_workouts}` : "—"}
                sub="total sessions"
                icon={TrendingUp}
                delay={0.1}
              />
              <StatCard
                label="Avg duration"
                value={
                  overview?.avg_duration_seconds != null
                    ? `${Math.round(overview.avg_duration_seconds / 60)}m`
                    : "—"
                }
                sub="per session"
                icon={Clock}
                delay={0.15}
              />
            </div>

            {prs && prs.length > 0 && <LatestPrCard pr={prs[0]} units={units} />}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground">Weekly Volume</h3>
                <span className="text-xs text-muted-foreground">Last 8 weeks</span>
              </div>
              {overview ? (
                <>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-2xl font-black text-foreground tabular-nums">
                      {formatVolume(thisWeekVolume)}{units}
                    </span>
                    {weekOverWeekLabel && (
                      <span className="text-xs font-medium text-primary bg-primary/10 rounded-md px-1.5 py-0.5 mb-0.5">
                        {weekOverWeekLabel} this week
                      </span>
                    )}
                  </div>
                  <BarChart data={volumeData} height={80} />
                </>
              ) : (
                <div className="flex items-center justify-center h-[80px]">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
                <Target className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  {overview
                    ? `${overview.consistent_weeks}/${overview.total_tracked_weeks} weeks consistent`
                    : "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {overview && overview.total_tracked_weeks > 0
                    ? `${Math.round((overview.consistent_weeks / overview.total_tracked_weeks) * 100)}% consistency rate · Keep it up!`
                    : "Since your plan's start date — one full week at a time"}
                </p>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* Strength */}
        <TabsContent value="strength">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search exercises..."
                value={prSearch}
                onChange={(e) => setPrSearch(e.target.value)}
                className="h-11 rounded-xl pl-9 pr-9 text-base"
              />
              {prSearch && (
                <button
                  type="button"
                  onClick={() => setPrSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {!filteredPrs ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPrs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Trophy className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {prSearch
                    ? `No PRs matching "${prSearch}"`
                    : "No PRs yet — log a workout to set your first one."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredPrs.map((pr, i) => (
                  <Link key={pr.exercise_id} href={`/old/exercises/${pr.exercise_id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.3) }}
                      className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 hover:ring-primary/30 transition-all"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Trophy className="size-4.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {pr.exercise_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pr.load}
                          {units} × {pr.reps} reps · {formatShortDate(pr.achieved_at)}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Volume */}
        <TabsContent value="volume">
          <div className="flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <MuscleBodyMap />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-foreground">Weekly Volume ({units})</h3>
              </div>
              {overview ? (
                <>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-2xl font-black text-foreground tabular-nums">
                      {thisWeekVolume.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground mb-0.5">{units} this week</span>
                  </div>
                  <BarChart data={volumeData} height={100} />
                </>
              ) : (
                <div className="flex items-center justify-center h-[100px]">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                {
                  label: "Best week",
                  value: overview ? `${formatVolume(overview.best_week_volume)}${units}` : "—",
                  sub: "Last 8 weeks",
                },
                {
                  label: "Avg/week",
                  value: overview ? `${formatVolume(overview.avg_week_volume)}${units}` : "—",
                  sub: "8-week avg",
                },
                {
                  label: "Total lifted",
                  value: overview ? `${formatVolume(overview.total_volume)}${units}` : "—",
                  sub: "All time",
                },
                {
                  label: "Growth rate",
                  value: growthRateLabel ?? "—",
                  sub: "vs ~3 months ago",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10"
                >
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-black text-foreground tabular-nums mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </TabsContent>

        {/* Body */}
        <TabsContent value="body">
          <BodyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
