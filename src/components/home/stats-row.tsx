"use client";

import { motion } from "framer-motion";
import { ProgressRing } from "@/components/shared/progress-ring";

/** Streak ring fills toward the next whole week — 7, 14, 21 days… */
const STREAK_MILESTONE_DAYS = 7;

interface StatsRowProps {
  /** Required days trained this week / required days this week. */
  sessionsDone: number;
  sessionsRequired: number;
  streak: number;
  weeklyVolume: number;
  /** Last calendar week's volume; null while unknown (ring shows empty). */
  lastWeekVolume: number | null;
  weightUnits: "kg" | "lbs";
}

function formatVolume(value: number, units: "kg" | "lbs") {
  // Tonnes only make sense as a kg-based shorthand — lbs users get a "k" shorthand instead.
  if (units === "kg") {
    if (value >= 1000) return { value: (value / 1000).toFixed(1), unit: "t" };
    return { value: `${Math.round(value)}`, unit: "kg" };
  }
  if (value >= 1000) return { value: (value / 1000).toFixed(1), unit: "k" };
  return { value: `${Math.round(value)}`, unit: "lb" };
}

function RingStat({
  delay,
  label,
  caption,
  children,
}: {
  delay: number;
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col items-center gap-1.5"
    >
      {children}
      <span className="label-caps">{label}</span>
      {caption && <span className="-mt-1 text-[11px] text-subtle">{caption}</span>}
    </motion.div>
  );
}

export function StatsRow({
  sessionsDone,
  sessionsRequired,
  streak,
  weeklyVolume,
  lastWeekVolume,
  weightUnits,
}: StatsRowProps) {
  const volume = formatVolume(weeklyVolume, weightUnits);
  const volumeRatio =
    lastWeekVolume == null ? 0 : lastWeekVolume > 0 ? weeklyVolume / lastWeekVolume : weeklyVolume > 0 ? 1 : 0;
  const volumeCaption =
    lastWeekVolume == null
      ? undefined
      : lastWeekVolume > 0
        ? `${Math.round((weeklyVolume / lastWeekVolume) * 100)}% of last wk`
        : "no volume last wk";

  const streakProgress = (streak % STREAK_MILESTONE_DAYS) / STREAK_MILESTONE_DAYS;
  const nextMilestone = (Math.floor(streak / STREAK_MILESTONE_DAYS) + 1) * STREAK_MILESTONE_DAYS;

  return (
    <div className="grid grid-cols-3 gap-2">
      <RingStat delay={0.05} label="Sessions" caption="this week">
        <ProgressRing
          value={sessionsRequired > 0 ? sessionsDone / sessionsRequired : 0}
          tone="success"
          label={`${sessionsDone} of ${sessionsRequired} sessions done this week`}
        >
          <span className="num text-[30px]">
            {sessionsDone}
            <span className="text-base text-muted-foreground">/{sessionsRequired}</span>
          </span>
        </ProgressRing>
      </RingStat>

      <RingStat delay={0.1} label="Volume" caption={volumeCaption}>
        <ProgressRing
          value={volumeRatio}
          tone="primary"
          label={`Weekly volume ${volume.value}${volume.unit}${volumeCaption ? `, ${volumeCaption}` : ""}`}
        >
          <span className="num text-[30px]">
            {volume.value}
            <span className="text-base text-muted-foreground">{volume.unit}</span>
          </span>
        </ProgressRing>
      </RingStat>

      <RingStat delay={0.15} label="Streak" caption={`next: ${nextMilestone}d`}>
        <ProgressRing
          value={streakProgress}
          tone="warning"
          label={`${streak} day streak, next milestone ${nextMilestone} days`}
        >
          <span className="num text-[30px]">
            {streak}
            <span className="text-base text-muted-foreground">d</span>
          </span>
        </ProgressRing>
      </RingStat>
    </div>
  );
}
