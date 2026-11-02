"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronRight, Moon, Pause, User } from "lucide-react";
import { motion } from "framer-motion";
import { TodayCard } from "@/components/home/today-card";
import { OngoingWorkoutBanner } from "@/components/home/ongoing-workout-banner";
import { HomeworkWidget } from "@/components/home/homework-widget";
import { StatsRow } from "@/components/home/stats-row";
import { WeightHomeWidget } from "@/components/weight/weight-home-widget";
import { WeeklyCheckinCard } from "@/components/home/weekly-checkin-card";
import { DayOffDrawer, type DayOffDrawerEditing } from "@/components/home/day-off-drawer";
import { DAY_OFF_BACKFILL_DAYS, addDaysIso, localDateIso } from "@/lib/api/days-off";
import {
  fetchDashboardStats,
  fetchProgressOverview,
  fetchRecentPRs,
  type DashboardStats,
  type PersonalRecord,
} from "@/lib/api/workout";
import { fetchUnreadNotificationCount } from "@/lib/api/notifications";
import { useNotificationsChanged } from "@/lib/realtime/notificationStream";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
import { cn } from "@/lib/utils";

const WEEK_DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const RECENT_PR_LIMIT = 3;

function formatToday() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function isTodayIso(isoDate: string) {
  const now = new Date();
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return isoDate.slice(0, 10) === local;
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="label-caps">{children}</h2>
      {action}
    </div>
  );
}

export default function HomePage() {
  const statsQuery = useCachedQuery<DashboardStats>("home/stats", fetchDashboardStats);
  const stats = statsQuery.data ?? null;
  // Kept after closing so the drawer can animate out with its content.
  const [dayOffTarget, setDayOffTarget] = useState<{ date: string; editing: DayOffDrawerEditing | null }>({
    date: localDateIso(),
    editing: null,
  });
  const [dayOffOpen, setDayOffOpen] = useState(false);
  // Bumped on every open so the drawer's form starts fresh.
  const [dayOffSeq, setDayOffSeq] = useState(0);
  // Last item of the series is the current week; the one before it is last week.
  const lastWeekVolume =
    useCachedQuery<number>("home/last-week-volume", () =>
      fetchProgressOverview().then((o) => o.weekly_volume_series.at(-2)?.volume ?? 0),
    ).data ?? null;
  const prs =
    useCachedQuery<PersonalRecord[]>(`home/recent-prs/${RECENT_PR_LIMIT}`, () => fetchRecentPRs(RECENT_PR_LIMIT))
      .data ?? null;
  const unreadQuery = useCachedQuery<number>("home/unread-notifications", fetchUnreadNotificationCount);
  const unreadNotifications = unreadQuery.data ?? 0;
  useNotificationsChanged(() => void unreadQuery.refresh());

  const units = stats?.weight_units ?? "kg";
  // A planned day taken off isn't a session owed this week.
  const required = stats?.week.filter((d) => d.required && (d.trained || !d.day_off)) ?? [];
  const requiredTrained = required.filter((d) => d.trained).length;
  const daysOffThisWeek = stats?.week.filter((d) => d.required && !d.trained && d.day_off).length ?? 0;

  const earliestDayOff = addDaysIso(localDateIso(), -DAY_OFF_BACKFILL_DAYS);
  const todayEntry = stats?.week.find((d) => isTodayIso(d.date)) ?? null;
  const canMarkDay = (d: DashboardStats["week"][number]) => d.required && !d.trained && d.date >= earliestDayOff;
  const openDayOff = (d: DashboardStats["week"][number]) => {
    setDayOffTarget({
      date: d.date,
      editing: d.day_off ? { date: d.date, category: d.day_off.category, note: d.day_off.note } : null,
    });
    setDayOffSeq((n) => n + 1);
    setDayOffOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-4">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex items-center justify-between"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-muted-foreground">{formatToday()}</span>
          <h1 className="font-display text-[22px] leading-none font-bold tracking-[0.02em] uppercase">Today</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
            className="relative flex size-11 items-center justify-center rounded-full border border-input bg-muted transition-colors hover:bg-secondary"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 size-2.5 rounded-full bg-primary ring-2 ring-background" />
            )}
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex size-11 items-center justify-center rounded-full border border-input bg-muted transition-colors hover:bg-secondary"
          >
            <User className="size-5" />
          </Link>
        </div>
      </motion.header>

      {stats ? (
        <StatsRow
          sessionsDone={requiredTrained}
          sessionsRequired={required.length}
          streak={stats.current_streak}
          weeklyVolume={stats.weekly_volume}
          lastWeekVolume={lastWeekVolume}
          weightUnits={units}
        />
      ) : (
        <div className="grid grid-cols-3 gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="mx-auto size-24 animate-pulse rounded-full border-[7px] border-secondary" />
          ))}
        </div>
      )}

      <OngoingWorkoutBanner />

      <TodayCard
        dayOff={todayEntry && !todayEntry.trained ? todayEntry.day_off : null}
        onTakeDayOff={todayEntry && canMarkDay(todayEntry) && !todayEntry.day_off ? () => openDayOff(todayEntry) : undefined}
        onEditDayOff={todayEntry?.day_off ? () => openDayOff(todayEntry) : undefined}
      />

      <HomeworkWidget />

      <WeeklyCheckinCard />

      {stats && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle
            action={
              <span className="text-xs text-muted-foreground">
                {requiredTrained}/{required.length} planned days
                {daysOffThisWeek > 0 && ` · ${daysOffThisWeek} off`}
              </span>
            }
          >
            This week
          </SectionTitle>
          <div className="grid grid-cols-7 gap-2">
            {stats.week.map((day, i) => {
              const { date, trained, required: isRequired, day_off: dayOff } = day;
              const today = isTodayIso(date);
              const off = !trained && dayOff;
              const tappable = canMarkDay(day);
              const cellClass = cn(
                "flex h-11 w-full items-center justify-center rounded-md",
                trained
                  ? "bg-primary text-primary-foreground"
                  : off
                    ? dayOff.protects_streak
                      ? "border border-warning-line bg-warning-surface text-warning"
                      : "border border-input bg-secondary text-muted-foreground"
                    : isRequired
                      ? "bg-secondary text-muted-foreground"
                      : "text-subtle",
                today && !trained && !off && "border-[1.5px] border-dashed border-primary",
                tappable && "transition-transform active:scale-95",
              );
              const content = trained ? (
                <Check className="size-4" strokeWidth={3} aria-label="Trained" />
              ) : off ? (
                <Pause
                  className="size-3.5"
                  strokeWidth={2.4}
                  aria-label={dayOff.protects_streak ? "Day off" : "Day off, past the limit"}
                />
              ) : !isRequired ? (
                <Moon className="size-3.5" aria-label="Rest day" />
              ) : (
                <span className="sr-only">Planned, not trained yet</span>
              );
              return (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  {tappable ? (
                    <button
                      type="button"
                      onClick={() => openDayOff(day)}
                      aria-label={`${off ? "Change day off" : "Take a day off"}, ${new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}`}
                      className={cellClass}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={cellClass}>{content}</div>
                  )}
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      today ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {WEEK_DAY_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-subtle">Tap a planned day to take it off.</p>
        </section>
      )}

      <DayOffDrawer
        key={dayOffSeq}
        open={dayOffOpen}
        initialDate={dayOffTarget.date}
        editing={dayOffTarget.editing}
        onClose={() => setDayOffOpen(false)}
        onSaved={() => void statsQuery.refresh()}
      />

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Body weight</SectionTitle>
        <WeightHomeWidget />
      </section>

      {prs && (
        <section className="flex flex-col">
          <SectionTitle
            action={
              <Link
                href="/progress?tab=strength"
                className="flex items-center gap-0.5 text-[13px] font-semibold text-primary"
              >
                See all <ChevronRight className="size-3.5" />
              </Link>
            }
          >
            Recent PRs
          </SectionTitle>
          {prs.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-input py-6 text-center text-sm text-muted-foreground">
              No PRs yet — log a workout to set your first one.
            </p>
          ) : (
            <div className="mt-1 flex flex-col">
              {prs.map((pr, i) => (
                <Link
                  key={pr.exercise_id}
                  href={`/exercises/${pr.exercise_id}`}
                  className={cn(
                    "flex items-center justify-between gap-3 py-3",
                    i < prs.length - 1 && "border-b border-line",
                  )}
                >
                  <span className="truncate text-[15px]">{pr.exercise_name}</span>
                  <span className="num shrink-0 text-xl">
                    {Math.round(pr.load * 10) / 10}
                    <span className="text-[13px] text-muted-foreground">
                      {" "}
                      {units} × {pr.reps}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
