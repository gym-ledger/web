"use client";

import Link from "next/link";
import { Bell, Check, ChevronRight, Moon, User } from "lucide-react";
import { motion } from "framer-motion";
import { TodayCard } from "@/components/home/today-card";
import { OngoingWorkoutBanner } from "@/components/home/ongoing-workout-banner";
import { HomeworkWidget } from "@/components/home/homework-widget";
import { StatsRow } from "@/components/home/stats-row";
import { WeightHomeWidget } from "@/components/weight/weight-home-widget";
import { WeeklyCheckinCard } from "@/components/home/weekly-checkin-card";
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
  const stats = useCachedQuery<DashboardStats>("home/stats", fetchDashboardStats).data ?? null;
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
  const required = stats?.week.filter((d) => d.required) ?? [];
  const requiredTrained = required.filter((d) => d.trained).length;

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

      <TodayCard />

      <HomeworkWidget />

      <WeeklyCheckinCard />

      {stats && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle
            action={
              <span className="text-xs text-muted-foreground">
                {requiredTrained}/{required.length} planned days
              </span>
            }
          >
            This week
          </SectionTitle>
          <div className="grid grid-cols-7 gap-2">
            {stats.week.map(({ date, trained, required: isRequired }, i) => {
              const today = isTodayIso(date);
              return (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-11 w-full items-center justify-center rounded-md",
                      trained
                        ? "bg-primary text-primary-foreground"
                        : isRequired
                          ? "bg-secondary text-muted-foreground"
                          : "text-subtle",
                      today && !trained && "border-[1.5px] border-dashed border-primary",
                    )}
                  >
                    {trained ? (
                      <Check className="size-4" strokeWidth={3} aria-label="Trained" />
                    ) : !isRequired ? (
                      <Moon className="size-3.5" aria-label="Rest day" />
                    ) : (
                      <span className="sr-only">Planned, not trained yet</span>
                    )}
                  </div>
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
        </section>
      )}

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
