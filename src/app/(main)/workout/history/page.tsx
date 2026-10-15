"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  fetchWorkoutSessions,
  type WorkoutSessionListItem,
} from "@/lib/api/workout";

function formatWeekday(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });
}

function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatDuration(startIso: string, endIso: string | null) {
  if (!endIso) return null;
  const minutes = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
  );
  return `${minutes}min`;
}

function SessionRow({ session, delay }: { session: WorkoutSessionListItem; delay: number }) {
  const duration = formatDuration(session.started_at, session.completed_at);

  return (
    <Link href={`/workout/history/${session.id}`} className="block border-b border-line">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="flex items-center gap-3 py-3.5"
      >
        <div className="flex w-12 shrink-0 flex-col items-center">
          <span className="label-caps text-[10px]">{formatWeekday(session.started_at)}</span>
          <span className="num text-[26px]">{new Date(session.started_at).getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-xl leading-tight font-bold">{session.day_name ?? "Workout"}</h3>
            {!session.completed_at && (
              <span className="shrink-0 rounded-md bg-warning-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-warning uppercase">
                In progress
              </span>
            )}
          </div>
          <p className="truncate text-[13px] text-muted-foreground">
            {session.plan_name}
            {session.session_name ? ` · ${session.session_name}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="num text-lg">
            {session.total_sets}
            <span className="text-[13px] text-muted-foreground"> sets</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {session.total_exercises} ex{duration ? ` · ${duration}` : ""}
          </span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-subtle" />
      </motion.div>
    </Link>
  );
}

export default function WorkoutHistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSessionListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchWorkoutSessions({ page: 1, limit: 20 })
      .then((res) => {
        setSessions(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchWorkoutSessions({ page: nextPage, limit: 20 });
      setSessions((prev) => [...prev, ...res.data]);
      setPage(nextPage);
    } catch {
      // no-op — user can tap "Load more" again
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col px-4 pb-8">
      <PageHeader title="History" subtitle="Past workouts" />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
          <p className="font-display text-2xl font-bold">No workouts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once you finish a workout, it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {sessions.map((session, i) => {
            const month = formatMonth(session.started_at);
            const showMonth = i === 0 || formatMonth(sessions[i - 1].started_at) !== month;
            return (
              <div key={session.id}>
                {showMonth && <h2 className="label-caps border-b border-line pt-4 pb-2">{month}</h2>}
                <SessionRow session={session} delay={Math.min(i, 10) * 0.03} />
              </div>
            );
          })}
          {page < totalPages && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-input text-sm font-semibold text-primary transition-colors hover:border-primary disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="size-4 animate-spin" />}
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
