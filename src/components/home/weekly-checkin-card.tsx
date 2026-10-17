"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import {
  dismissWeeklyCheckin,
  fetchWeeklyCheckin,
  type WeeklyCheckin,
  type WeeklyCheckinResponse,
  type WeightPaceStatus,
} from "@/lib/api/checkins";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
import { cn } from "@/lib/utils";

// Another request may be writing the note right now; check back a few times.
const PENDING_POLL_MS = 3000;
const PENDING_MAX_POLLS = 5;

function formatRange(start: string, end: string) {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
  return s.getMonth() === e.getMonth()
    ? `${s.getDate()}–${e.getDate()} ${month(e)}`
    : `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)}`;
}

function formatVolume(value: number, units: string) {
  if (value >= 1000) return { value: (value / 1000).toFixed(1), unit: units === "kg" ? "t" : "k" };
  return { value: `${Math.round(value)}`, unit: units === "kg" ? "kg" : "lb" };
}

function signed(value: number, digits = 1) {
  const abs = Math.abs(value).toFixed(digits);
  return value > 0 ? `+${abs}` : value < 0 ? `−${abs}` : abs;
}

const PACE_LABEL: Record<WeightPaceStatus, { text: string; tone: "success" | "warning" | "muted" } | null> = {
  on_track: { text: "On pace", tone: "success" },
  goal_reached: { text: "Goal reached", tone: "success" },
  behind: { text: "Behind pace", tone: "warning" },
  too_fast: { text: "Too fast", tone: "warning" },
  wrong_direction: { text: "Wrong way", tone: "warning" },
  drifting_up: { text: "Drifting up", tone: "warning" },
  drifting_down: { text: "Drifting down", tone: "warning" },
  not_enough_data: { text: "Weigh in more", tone: "muted" },
  no_goal: null,
};

function Stat({ label, children, caption }: { label: string; children: React.ReactNode; caption?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="label-caps text-[10px]">{label}</span>
      <span className="num text-[26px] leading-none">{children}</span>
      {caption && <span className="truncate text-[12px] font-semibold">{caption}</span>}
    </div>
  );
}

function StatsStrip({ checkin }: { checkin: WeeklyCheckin }) {
  const { training, weight, goal, weight_units: units } = checkin.stats;
  const volume = formatVolume(training.volume, units);
  const pace = PACE_LABEL[goal.pace_status];
  const volumeChange = training.volume_change_vs_usual_pct;

  return (
    <div className="grid grid-cols-3 gap-3 border-y border-line py-3">
      <Stat
        label="Sessions"
        caption={
          training.planned_sessions > 0 ? (
            <span className="text-muted-foreground">{training.planned_days_trained} of {training.planned_sessions} planned</span>
          ) : undefined
        }
      >
        {training.sessions_completed}
      </Stat>
      <Stat
        label="Volume"
        caption={
          volumeChange != null ? (
            <span className={volumeChange >= 0 ? "text-primary" : "text-muted-foreground"}>
              {signed(volumeChange, 0)}% vs usual
            </span>
          ) : undefined
        }
      >
        {volume.value}
        <span className="ml-0.5 text-[13px] text-muted-foreground">{volume.unit}</span>
      </Stat>
      <Stat
        label="Weight / wk"
        caption={
          pace ? (
            <span
              className={cn(
                pace.tone === "success" && "text-success",
                pace.tone === "warning" && "text-warning",
                pace.tone === "muted" && "text-muted-foreground",
              )}
            >
              {pace.text}
            </span>
          ) : (
            <span className="text-muted-foreground">No goal</span>
          )
        }
      >
        {weight.trend_per_week != null ? (
          <>
            {signed(weight.trend_per_week)}
            <span className="ml-0.5 text-[13px] text-muted-foreground">{units}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Stat>
    </div>
  );
}

/**
 * Last week's AI-written check-in. The numbers come from the API's own
 * stats; only the wording is generated. Hidden once dismissed, or when the
 * week didn't qualify for one.
 */
export function WeeklyCheckinCard() {
  const { data, refresh, mutate } = useCachedQuery<WeeklyCheckinResponse>("home/weekly-checkin", fetchWeeklyCheckin);
  const [dismissing, setDismissing] = useState(false);
  const polls = useRef(0);

  const status = data?.status;
  useEffect(() => {
    if (status !== "pending" || polls.current >= PENDING_MAX_POLLS) return;
    const t = setTimeout(() => {
      polls.current += 1;
      void refresh();
    }, PENDING_POLL_MS);
    return () => clearTimeout(t);
  }, [status, data, refresh]);

  const checkin = data?.checkin ?? null;
  // A skipped week (not enough weigh-ins / workouts) is explained by a notification instead.
  if (!checkin || checkin.dismissed || checkin.status === "skipped") return null;

  async function handleDismiss() {
    if (!checkin) return;
    setDismissing(true);
    try {
      await dismissWeeklyCheckin(checkin.id);
      mutate((prev) => (prev?.checkin ? { ...prev, checkin: { ...prev.checkin, dismissed: true } } : prev!));
    } catch {
      toast.error("Failed to dismiss");
      setDismissing(false);
    }
  }

  const content = checkin.content;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="label-caps text-primary">Weekly check-in</h2>
        <span className="text-xs text-muted-foreground">{formatRange(checkin.week_start, checkin.week_end)}</span>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-start justify-between gap-3">
          {content ? (
            <h3 className="font-display text-[22px] leading-tight font-bold">{content.headline}</h3>
          ) : checkin.status === "pending" ? (
            <div className="h-6 w-3/4 animate-pulse rounded-md bg-secondary" aria-label="Writing your check-in" />
          ) : (
            <h3 className="font-display text-[22px] leading-tight font-bold">Last week in numbers</h3>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            aria-label="Dismiss this week's check-in"
            className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <StatsStrip checkin={checkin} />

        {content ? (
          <>
            <p className="text-[15px] leading-snug">{content.summary}</p>

            {content.wins.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {content.wins.map((win) => (
                  <li key={win} className="flex items-start gap-2 text-[14px]">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} aria-hidden="true" />
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col">
              <span className="label-caps pb-1">Next week</span>
              {content.focus.map((item, i) => (
                <div key={item.title} className={cn("py-2.5", i < content.focus.length - 1 && "border-b border-line")}>
                  <p className="text-[15px] font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-subtle">Written by AI from your logged data. Not medical advice.</p>
          </>
        ) : checkin.status === "pending" ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            <div className="h-4 w-full animate-pulse rounded bg-secondary" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-secondary" />
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Your coach note isn&apos;t ready yet — check back later.
          </p>
        )}

        {checkin.stats.goal.pace_status === "no_goal" && (
          <Link
            href="/profile/settings"
            className="-mx-1 flex min-h-11 items-center justify-between rounded-xl px-1 text-[13px] font-semibold text-primary"
          >
            Set a body-weight goal for sharper advice
            <ChevronRight className="size-4" />
          </Link>
        )}
      </motion.article>
    </section>
  );
}
