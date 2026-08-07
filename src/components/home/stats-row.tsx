"use client";

import { Flame, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ElementType;
  delay?: number;
}

function StatItem({ label, value, icon: Icon, delay = 0 }: StatItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay }}
      className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10"
    >
      <Icon className="size-5 text-primary" />
      <span className="text-lg font-black text-foreground tabular-nums">{value}</span>
      <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </motion.div>
  );
}

interface StatsRowProps {
  streak: number;
  weeklyVolume: number;
  weightUnits: "kg" | "lbs";
}

export function StatsRow({ streak, weeklyVolume, weightUnits }: StatsRowProps) {
  const formatVolume = (value: number) => {
    // Tonnes only make sense as a kg-based shorthand — lbs users just see the raw number.
    if (weightUnits === "kg" && value >= 1000) return `${(value / 1000).toFixed(1)}t`;
    return `${Math.round(value)}${weightUnits}`;
  };

  return (
    <div className="flex gap-3">
      <StatItem
        label="Day streak"
        value={`${streak}`}
        icon={Flame}
        delay={0.1}
      />
      <StatItem
        label="Weekly vol."
        value={formatVolume(weeklyVolume)}
        icon={Zap}
        delay={0.15}
      />
    </div>
  );
}
