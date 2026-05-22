"use client";

import { motion } from "framer-motion";
import { TrendingUp, Dumbbell, Clock, Target, Ruler } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { LineChart, BarChart } from "@/components/progress/mini-chart";
import {
  overviewStats,
  weeklyVolumeData,
  benchPressProgress,
  squatProgress,
} from "@/lib/data/progress";
import { cn } from "@/lib/utils";

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

export default function ProgressPage() {
  const benchData = benchPressProgress.map((d) => ({ label: d.date, value: d.weight }));
  const squatData = squatProgress.map((d) => ({ label: d.date, value: d.weight }));
  const volumeData = weeklyVolumeData.map((d) => ({ label: d.week, value: d.volume }));

  const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return `${v}`;
  };

  return (
    <div className="flex flex-col px-4 pt-4">
      <PageHeader title="Progress" />

      <Tabs defaultValue="overview" className="flex-1">
        <TabsList className="w-full mb-5 overflow-x-auto scrollbar-none">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="strength" className="flex-1">Strength</TabsTrigger>
          <TabsTrigger value="volume" className="flex-1">Volume</TabsTrigger>
          <TabsTrigger value="body" className="flex-1">Body</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="flex flex-col gap-5">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Total volume"
                value={`${formatVolume(overviewStats.totalVolume)}kg`}
                icon={Dumbbell}
                delay={0.05}
              />
              <StatCard
                label="Workouts"
                value={`${overviewStats.totalWorkouts}`}
                sub="total sessions"
                icon={TrendingUp}
                delay={0.1}
              />
              <StatCard
                label="Avg duration"
                value={`${overviewStats.avgDuration}m`}
                sub="per session"
                icon={Clock}
                delay={0.15}
              />
            </div>

            {/* Bench Press chart */}
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

            {/* Weekly volume chart */}
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
              <div className="flex items-end gap-2 mb-3">
                <span className="text-2xl font-black text-foreground tabular-nums">24.8t</span>
                <span className="text-xs font-medium text-primary bg-primary/10 rounded-md px-1.5 py-0.5 mb-0.5">
                  +8% this week
                </span>
              </div>
              <BarChart data={volumeData} height={80} />
            </motion.div>

            {/* Consistency */}
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-foreground">Weekly Volume (kg)</h3>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-2xl font-black text-foreground tabular-nums">24,800</span>
                <span className="text-sm text-muted-foreground mb-0.5">kg this week</span>
              </div>
              <BarChart data={volumeData} height={100} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: "Best week", value: "24,800kg", sub: "This week" },
                { label: "Avg/week", value: "21,863kg", sub: "8-week avg" },
                { label: "Total lifted", value: "1.25M kg", sub: "All time" },
                { label: "Growth rate", value: "+36%", sub: "vs 3 months ago" },
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
          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 flex flex-col items-center gap-3 text-center"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Ruler className="size-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Body metrics</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Log your weight, body fat, and measurements to track composition changes.
                </p>
              </div>
              <button className="mt-1 h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                Log body weight
              </button>
            </motion.div>

            {/* Placeholder entries */}
            {[
              { date: "May 21", weight: "78.2 kg", note: "Morning, fasted" },
              { date: "May 19", weight: "78.6 kg", note: "Morning, fasted" },
              { date: "May 17", weight: "78.4 kg", note: "Morning, fasted" },
              { date: "May 14", weight: "79.0 kg", note: "Morning, fasted" },
            ].map((entry, i) => (
              <motion.div
                key={entry.date}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{entry.weight}</p>
                  <p className="text-xs text-muted-foreground">{entry.note}</p>
                </div>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
