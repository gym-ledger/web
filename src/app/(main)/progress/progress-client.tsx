"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { TrendingUp, Dumbbell, Clock, Target, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { LineChart, BarChart } from "@/components/progress/mini-chart";
import { BodyTab } from "@/components/weight/body-tab";
import {
  overviewStats,
  benchPressProgress,
  squatProgress,
} from "@/lib/data/progress";
import { fetchProgressOverview, type ProgressOverview } from "@/lib/api/workout";

// Code-split out the body-muscles SVG library (only needed once the Volume
// tab is actually opened) instead of shipping it in the initial /progress bundle.
const MuscleBodyMap = dynamic(
  () => import("@/components/progress/muscle-body-map").then((mod) => mod.MuscleBodyMap),
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

export function ProgressPageClient({ defaultTab }: Props) {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);

  useEffect(() => {
    fetchProgressOverview()
      .then(setOverview)
      .catch(() => {});
  }, []);

  const benchData = benchPressProgress.map((d) => ({ label: d.date, value: d.weight }));
  const squatData = squatProgress.map((d) => ({ label: d.date, value: d.weight }));
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground">Bench Press</h3>
                <span className="text-xs text-muted-foreground">Last 12 weeks</span>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-2xl font-black text-foreground tabular-nums">92.5</span>
                <span className="text-sm text-muted-foreground mb-0.5">kg</span>
                <span className="text-xs font-medium text-primary bg-primary/10 rounded-md px-1.5 py-0.5 mb-0.5">
                  +17.5kg
                </span>
              </div>
              <LineChart data={benchData} height={90} />
            </motion.div>

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
                  {overviewStats.consistencyWeeks}/{overviewStats.consistencyTotal} weeks consistent
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(
                    (overviewStats.consistencyWeeks / overviewStats.consistencyTotal) * 100
                  )}
                  % consistency rate · Keep it up!
                </p>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* Strength */}
        <TabsContent value="strength">
          <div className="flex flex-col gap-4">
            {[
              { name: "Bench Press", data: benchData, current: 92.5, change: "+17.5", unit: "kg" },
              { name: "Squat", data: squatData, current: 120, change: "+25", unit: "kg" },
            ].map((lift, i) => (
              <motion.div
                key={lift.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-foreground">{lift.name}</h3>
                  <span className="text-xs text-muted-foreground">12 weeks</span>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-black text-foreground tabular-nums">
                    {lift.current}
                  </span>
                  <span className="text-sm text-muted-foreground mb-0.5">{lift.unit}</span>
                  <span className="text-xs font-medium text-primary bg-primary/10 rounded-md px-1.5 py-0.5 mb-0.5">
                    {lift.change}kg
                  </span>
                </div>
                <LineChart data={lift.data} height={80} />
              </motion.div>
            ))}
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
