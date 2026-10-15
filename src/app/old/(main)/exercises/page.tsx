"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronRight, Dumbbell, Loader2 } from "lucide-react";
import { Input } from "@/old-ui/components/ui/input";
import { PageHeader } from "@/old-ui/components/shared/page-header";
import { fetchExercises, fetchMuscles, type ExerciseListItem, type Muscle } from "@/lib/api/exercises";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 30;
const SEARCH_DEBOUNCE_MS = 300;

function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Muscle a card badges itself with — the one it trains most. */
function primaryMuscle(exercise: ExerciseListItem) {
  return exercise.muscles[0] ?? null;
}

export default function ExercisesPage() {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [activeBodyRegion, setActiveBodyRegion] = useState<string | null>(null);

  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box so we're not firing a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [rawQuery]);

  useEffect(() => {
    fetchMuscles()
      .then(setMuscles)
      .catch(() => setMuscles([]));
  }, []);

  // Body regions actually present in the muscle catalog, in the server's
  // display order, deduped — these drive the filter chips instead of a
  // hardcoded guess at the taxonomy.
  const bodyRegions = useMemo(() => {
    const seen = new Set<string>();
    const regions: string[] = [];
    for (const m of muscles) {
      if (m.body_region && !seen.has(m.body_region)) {
        seen.add(m.body_region);
        regions.push(m.body_region);
      }
    }
    return regions;
  }, [muscles]);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const res = await fetchExercises({
          search: query || undefined,
          bodyRegion: activeBodyRegion ?? undefined,
          page: 1,
          limit: PAGE_LIMIT,
        });
        if (cancelled) return;
        setExercises(res.data);
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
        setTotalCount(res.meta.totalCount);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load exercises");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query, activeBodyRegion]);

  function loadMore() {
    setLoadingMore(true);
    fetchExercises({
      search: query || undefined,
      bodyRegion: activeBodyRegion ?? undefined,
      page: page + 1,
      limit: PAGE_LIMIT,
    })
      .then((res) => {
        setExercises((prev) => [...prev, ...res.data]);
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }

  return (
    <div className="flex flex-col pt-4">
      <div className="px-4">
        <PageHeader title="Exercises" subtitle={isPending ? "Loading…" : `${totalCount} exercises`} />
      </div>

      {/* Sticky search + filters */}
      <div className="sticky top-0 z-30 bg-background px-4 pb-3 pt-1">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exercises..."
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="h-11 rounded-xl pl-9 text-base"
          />
        </div>

        {bodyRegions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setActiveBodyRegion(null)}
              className={cn(
                "shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors",
                activeBodyRegion === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              )}
            >
              All
            </button>
            {bodyRegions.map((region) => (
              <button
                key={region}
                onClick={() => setActiveBodyRegion(region)}
                className={cn(
                  "shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors",
                  activeBodyRegion === region
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                )}
              >
                {titleCase(region)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-2 px-4 pb-4">
        {error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : isPending && exercises.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Search className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No exercises found{query ? ` for "${query}"` : ""}
            </p>
          </div>
        ) : (
          <>
            {exercises.map((ex, i) => {
              const top = primaryMuscle(ex);
              return (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <Link href={`/old/exercises/${ex.id}`}>
                    <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 hover:ring-primary/30 transition-all">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Dumbbell className="size-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {ex.name}
                        </p>
                        {top && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {top.name}
                            {ex.muscles.length > 1 && ` +${ex.muscles.length - 1} more`}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {page < totalPages && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-2 flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
