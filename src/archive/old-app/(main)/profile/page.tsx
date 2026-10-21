"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, Edit2, Star, Award, Flame, Zap, Dumbbell, Trophy } from "lucide-react";
import { Button } from "@/archive/old-ui/components/ui/button";
import { currentUser, achievements, favoriteExercises } from "@/lib/data/user";
import { exercises } from "@/lib/data/exercises";
import { cn } from "@/lib/utils";

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
};

const achievementIcons: Record<string, React.ElementType> = {
  "first-workout": Dumbbell,
  "streak-7": Flame,
  "100-workouts": Award,
  "pr-master": Trophy,
};

export default function ProfilePage() {
  const memberSince = new Date(currentUser.memberSince).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const favoriteExerciseObjects = favoriteExercises
    .map((id) => exercises.find((e) => e.id === id))
    .filter(Boolean);

  return (
    <div className="flex flex-col px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2 mb-2">
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        <Link href="/old/settings">
          <button className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-foreground/10 hover:bg-secondary transition-colors">
            <Settings className="size-4 text-foreground" />
          </button>
        </Link>
      </div>

      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 mb-5"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex size-18 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-2 ring-primary/30">
            <span className="text-3xl font-black text-primary">
              {currentUser.name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground">{currentUser.name}</h2>
            <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
            <p className="text-xs text-muted-foreground mt-1">Member since {memberSince}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs rounded-lg bg-primary/10 text-primary px-2 py-0.5 font-medium capitalize">
                {currentUser.experience}
              </span>
              <span className="text-xs rounded-lg bg-secondary text-secondary-foreground px-2 py-0.5 font-medium capitalize">
                {currentUser.goal.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full h-9 rounded-xl gap-2"
        >
          <Edit2 className="size-3.5" />
          Edit Profile
        </Button>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="grid grid-cols-2 gap-3 mb-5"
      >
        {[
          { label: "Workouts", value: `${currentUser.stats.totalWorkouts}`, icon: Dumbbell },
          { label: "Personal Records", value: `${currentUser.stats.totalPRs}`, icon: Trophy },
          { label: "Best Streak", value: `${currentUser.stats.longestStreak}d`, icon: Flame },
          { label: "Volume lifted", value: formatNumber(currentUser.stats.totalVolume) + "kg", icon: Zap },
        ].map(({ label, value, icon: StatIcon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 + i * 0.04 }}
            className="flex flex-col gap-1.5 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <StatIcon className="size-5 text-primary" />
            <p className="text-2xl font-black text-foreground tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Achievements</h2>
          <Award className="size-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((achievement, i) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.04 }}
              className={cn(
                "flex flex-col gap-2 rounded-2xl p-3.5 ring-1",
                achievement.unlocked
                  ? "bg-card ring-foreground/10"
                  : "bg-secondary/30 ring-foreground/5"
              )}
            >
              {(() => {
                const AchIcon = achievementIcons[achievement.id] ?? Award;
                return <AchIcon className={cn("size-6 text-primary", !achievement.unlocked && "opacity-30")} />;
              })()}
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    achievement.unlocked ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {achievement.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
              </div>
              {achievement.unlocked && achievement.unlockedDate && (
                <p className="text-[10px] text-primary">
                  Unlocked {new Date(achievement.unlockedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
              {!achievement.unlocked && (
                <p className="text-[10px] text-muted-foreground/50">Locked</p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Favourite exercises */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-bold text-foreground">Favourite Exercises</h2>
          <Star className="size-4 text-primary fill-primary" />
        </div>
        <div className="flex flex-col gap-2">
          {favoriteExerciseObjects.map((ex, i) => (
            ex && (
              <Link key={ex.id} href={`/old/exercises/${ex.id}`}>
                <div className="flex items-center gap-3 rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10 hover:ring-primary/30 transition-all">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Dumbbell className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ex.primaryMuscle}</p>
                  </div>
                </div>
              </Link>
            )
          ))}
        </div>
      </motion.div>
    </div>
  );
}
