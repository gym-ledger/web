"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/old-ui/components/shared/page-header";
import {
  fetchWorkoutSessions,
  type WorkoutSessionListItem,
} from "@/lib/api/workout";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(startIso: string, endIso: string | null) {
  if (!endIso) return null;
  const minutes = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
  );
  return `${minutes}min`;
}

function SessionCard({ session, delay }: { session: WorkoutSessionListItem; delay: number }) {
  const duration = formatDuration(session.started_at, session.completed_at);

  return (
    <Link href={`/old/workout/history/${session.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 hover:bg-secondary/40 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">
              {session.day_name ?? "Workout"}
            </h3>
            {!session.completed_at && (
              <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                In progress
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {session.plan_name}
            {session.session_name ? ` · ${session.session_name}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(session.started_at)}
            {" · "}
            {session.total_exercises} exercise{session.total_exercises !== 1 ? "s" : ""}
            {" · "}
            {session.total_sets} set{session.total_sets !== 1 ? "s" : ""}
            {duration ? ` · ${duration}` : ""}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
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
    <div className="flex flex-col px-4 pt-4 pb-8">
      <PageHeader title="Workout History" />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold text-foreground">No workouts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once you finish a workout, it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sessions.map((session, i) => (
            <SessionCard key={session.id} session={session} delay={i * 0.03} />
          ))}
          {page < totalPages && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
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
