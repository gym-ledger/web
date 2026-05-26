"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { Sparkline } from "@/components/progress/mini-chart";
import { fetchWeightForDate, WeightEntry } from "@/lib/api/weight";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function subDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function fmtWeight(w: number) {
  console.log('w', w)
  console.log(typeof w)
  return w % 1 === 0 ? `${w}` : w.toFixed(1);
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-muted-foreground">—</span>;
  const abs = Math.abs(delta).toFixed(1);
  if (delta < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-500">
        <TrendingDown className="size-3" />
        {abs} kg
      </span>
    );
  if (delta > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-rose-400">
        <TrendingUp className="size-3" />
        {abs} kg
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="size-3" />
      0 kg
    </span>
  );
}

export function WeightHomeWidget() {
  const router = useRouter();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeightForDate(todayISO())
      .then((d) => setEntries(d.weight_entries))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

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
    return (
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 animate-pulse h-28" />
    );
  }

  if (entries.length === 0) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleClick}
        className="w-full rounded-2xl bg-card p-4 ring-1 ring-foreground/10 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
          <Scale className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Track your weight</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tap to log your first entry</p>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="w-full rounded-2xl bg-card p-4 ring-1 ring-foreground/10 text-left hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
            <Scale className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground leading-none">Body weight</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-foreground tabular-nums">
                {fmtWeight(latest!.weight)}
              </span>
              <span className="text-xs font-medium text-muted-foreground">kg</span>
            </div>
          </div>
        </div>

        {sparkValues.length >= 2 && (
          <Sparkline data={sparkValues} width={80} height={36} />
        )}
      </div>

      <div className="flex gap-4 mt-3">
        <div>
          <p className="text-[10px] text-muted-foreground">7-day</p>
          <DeltaBadge delta={delta7} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">30-day</p>
          <DeltaBadge delta={delta30} />
        </div>
      </div>
    </motion.button>
  );
}
