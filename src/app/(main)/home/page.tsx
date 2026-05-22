"use client";

import Link from "next/link";
import { Bell, Trophy, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { TodayCard } from "@/components/home/today-card";
import { StatsRow } from "@/components/home/stats-row";
import { currentUser, weeklyConsistency } from "@/lib/data/user";
import { todayWorkout } from "@/lib/data/workouts";
import { recentPRs } from "@/lib/data/progress";
import { cn } from "@/lib/utils";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
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
            {currentUser.name.split(" ")[0]} 👋
          </h1>
        </div>
        <Link href="/notifications">
          <button className="relative flex size-10 items-center justify-center rounded-xl bg-card ring-1 ring-foreground/10 hover:bg-secondary transition-colors">
            <Bell className="size-5 text-foreground" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
          </button>
        </Link>
      </motion.div>

      <div className="flex flex-col gap-6 mt-4">
        {/* Today's workout */}
        <TodayCard
          programName={todayWorkout.programName}
          dayName={todayWorkout.dayName}
          exercises={todayWorkout.exercises}
        />

        {/* Stats row */}
        <div>
          <StatsRow
            streak={currentUser.stats.currentStreak}
            weeklyVolume={currentUser.stats.weeklyVolume}
            monthlyWorkouts={currentUser.stats.monthlyWorkouts}
          />
        </div>

        {/* Recent PRs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">Recent PRs</h2>
            <Link href="/progress" className="text-xs text-primary flex items-center gap-0.5">
              See all <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {recentPRs.map((pr, i) => (
              <motion.div
                key={pr.exerciseId}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.05 + i * 0.05 }}
                className="flex shrink-0 flex-col gap-2 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 min-w-[140px]"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                  <Trophy className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none">{pr.exerciseName}</p>
                  <p className="text-lg font-black text-foreground mt-1 leading-none tabular-nums">
                    {pr.weight}
                    <span className="text-xs font-medium text-muted-foreground ml-0.5">kg</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">× {pr.reps} reps</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Weekly consistency */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">This week</h2>
            <span className="text-xs text-muted-foreground">
              {weeklyConsistency.filter((d) => d.trained).length}/7 days
            </span>
          </div>
          <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex justify-between">
              {weeklyConsistency.map(({ day, trained }) => (
                <div key={day} className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "size-8 rounded-xl flex items-center justify-center transition-colors",
                      trained
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {trained ? (
                      <span className="text-xs font-bold">✓</span>
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
