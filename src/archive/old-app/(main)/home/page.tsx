"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Trophy, ChevronRight, Check, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { TodayCard } from "@/archive/old-ui/components/home/today-card";
import { OngoingWorkoutBanner } from "@/archive/old-ui/components/home/ongoing-workout-banner";
import { HomeworkWidget } from "@/archive/old-ui/components/home/homework-widget";
import { StatsRow } from "@/archive/old-ui/components/home/stats-row";
import { WeightHomeWidget } from "@/archive/old-ui/components/weight/weight-home-widget";
import { currentUser } from "@/lib/data/user";
import {
  fetchDashboardStats,
  fetchRecentPRs,
  type DashboardStats,
  type PersonalRecord,
} from "@/lib/api/workout";
import { cn } from "@/lib/utils";

const WEEK_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[] | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => {});
    fetchRecentPRs()
      .then(setPrs)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col px-4 pt-4 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex items-center justify-between py-2 mb-1"
      >
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()}</p>
          <h1 className="text-2xl font-bold text-foreground">
            {currentUser.name.split(" ")[0]}
          </h1>
        </div>
        <Link href="/old/notifications">
          <button className="relative flex size-10 items-center justify-center rounded-xl bg-card ring-1 ring-foreground/10 hover:bg-secondary transition-colors">
            <Bell className="size-5 text-foreground" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
          </button>
        </Link>
      </motion.div>

      <div className="flex flex-col gap-6 mt-4">
        {/* Ongoing workout — resume if one was left unfinished */}
        <OngoingWorkoutBanner />

        {/* Homework — flagged alarms from past workout sets, until discarded */}
        <HomeworkWidget />

        {/* Today's workout */}
        <TodayCard />

        {/* Stats row */}
        <div>
          <StatsRow
            streak={stats?.current_streak ?? 0}
            weeklyVolume={stats?.weekly_volume ?? 0}
            weightUnits={stats?.weight_units ?? "kg"}
          />
        </div>

        {/* Weight widget */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">Weight</h2>
          </div>
          <WeightHomeWidget />
        </div>

        {/* Recent PRs */}
        {prs && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">Recent PRs</h2>
              <Link href="/old/progress?tab=strength" className="text-xs text-primary flex items-center gap-0.5">
                See all <ChevronRight className="size-3" />
              </Link>
            </div>
            {prs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No PRs yet — log a workout to set your first one.
                </p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                {prs.map((pr, i) => (
                  <Link key={pr.exercise_id} href={`/old/exercises/${pr.exercise_id}`}>
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.05 + i * 0.05 }}
                      className="flex shrink-0 flex-col gap-2 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 min-w-[140px]"
                    >
                      <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                        <Trophy className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground leading-none truncate">
                          {pr.exercise_name}
                        </p>
                        <p className="text-lg font-black text-foreground mt-1 leading-none tabular-nums">
                          {Math.round(pr.load * 10) / 10}
                          <span className="text-xs font-medium text-muted-foreground ml-0.5">
                            {stats?.weight_units ?? "kg"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">× {pr.reps} reps</p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weekly consistency */}
        {stats && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">This week</h2>
              <span className="text-xs text-muted-foreground">
                {stats.week.filter((d) => d.required && d.trained).length}/
                {stats.week.filter((d) => d.required).length} days
              </span>
            </div>
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex justify-between">
                {stats.week.map(({ date, trained, required }, i) => (
                  <div key={date} className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "size-8 rounded-xl flex items-center justify-center transition-colors",
                        !required
                          ? "bg-emerald-500/15 text-emerald-600"
                          : trained
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {!required ? (
                        <Moon className="size-3.5" />
                      ) : trained ? (
                        <Check className="size-3.5" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{WEEK_DAY_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
