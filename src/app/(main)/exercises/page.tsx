"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import {
  fetchExercises,
  fetchMuscles,
  type ExerciseListItem,
  type ExercisesPage,
  type Muscle,
} from "@/lib/api/exercises";
import { ApiError } from "@/lib/api-client";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
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

  const musclesQuery = useCachedQuery<Muscle[]>("exercises/muscles", fetchMuscles);
  const muscles = useMemo(() => musclesQuery.data ?? [], [musclesQuery.data]);

  // Identifies the current list; "Load more" pages belong to one list only.
  const listKey = `${activeBodyRegion ?? ""}|${query}`;

  // Browsing (no search text) is saved per body region and shows instantly.
  // Typed searches are not saved, so they don't pile up in storage.
  const browse = useCachedQuery<ExercisesPage>(
    query ? null : `exercises/list/${activeBodyRegion ?? "all"}/${PAGE_LIMIT}`,
    () => fetchExercises({ bodyRegion: activeBodyRegion ?? undefined, page: 1, limit: PAGE_LIMIT }),
  );
  const [search, setSearch] = useState<{ key: string; result: ExercisesPage } | null>(null);
  const [searchError, setSearchError] = useState<{ key: string; message: string } | null>(null);
  const [isSearching, startTransition] = useTransition();
  const [more, setMore] = useState<{ key: string; items: ExerciseListItem[]; page: number } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // While a new search loads, the previous results stay up.
  const firstPage = query ? search?.result : browse.data;
  const extra = more?.key === listKey ? more : null;
  const exercises = [...(firstPage?.data ?? []), ...(extra?.items ?? [])];
  const page = extra?.page ?? firstPage?.meta.page ?? 1;
  const totalPages = firstPage?.meta.totalPages ?? 1;
  const totalCount = firstPage?.meta.totalCount ?? 0;
  const isPending = query ? isSearching : browse.loading;
  const error = query
    ? searchError?.key === listKey
      ? searchError.message
      : null
    : browse.error && !browse.data
      ? browse.error instanceof ApiError
        ? browse.error.message
        : "Failed to load exercises"
      : null;

  // Debounce the search box so we're not firing a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [rawQuery]);

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
    if (!query) return;
    let cancelled = false;
    const key = listKey;
    startTransition(async () => {
      try {
        const res = await fetchExercises({
          search: query,
          bodyRegion: activeBodyRegion ?? undefined,
          page: 1,
          limit: PAGE_LIMIT,
        });
        if (cancelled) return;
        setSearch({ key, result: res });
        setSearchError(null);
      } catch (err) {
        if (cancelled) return;
        setSearchError({ key, message: err instanceof ApiError ? err.message : "Failed to load exercises" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query, activeBodyRegion, listKey]);

  function loadMore() {
    const key = listKey;
    setLoadingMore(true);
    fetchExercises({
      search: query || undefined,
      bodyRegion: activeBodyRegion ?? undefined,
      page: page + 1,
      limit: PAGE_LIMIT,
    })
      .then((res) => {
        setMore((prev) => ({
          key,
          items: [...(prev?.key === key ? prev.items : []), ...res.data],
          page: res.meta.page,
        }));
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }

  return (
    <div className="flex flex-col">
      <div className="px-4">
        <PageHeader title="Library" subtitle={isPending ? "Loading…" : `${totalCount} exercises`} />
      </div>

      {/* Sticky search + filters */}
      <div className="sticky top-0 z-30 border-b border-line bg-background/95 px-4 pt-1 pb-3 backdrop-blur-sm">
        <div className="relative mb-3">
          <Search className="absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exercises..."
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="h-12 rounded-[14px] pl-10 text-base"
          />
        </div>

        {bodyRegions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setActiveBodyRegion(null)}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                activeBodyRegion === null
                  ? "border-foreground bg-foreground text-background"
                  : "border-input bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {bodyRegions.map((region) => (
              <button
                key={region}
                onClick={() => setActiveBodyRegion(region)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                  activeBodyRegion === region
                    ? "border-foreground bg-foreground text-background"
                    : "border-input bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {titleCase(region)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex flex-col px-4 pb-4">
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
                  <Link href={`/exercises/${ex.id}`} className="block border-b border-line">
                    <div className="flex min-h-16 items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold">{ex.name}</p>
                        {top && (
                          <p className="text-[13px] text-muted-foreground">
                            {top.name}
                            {ex.muscles.length > 1 && ` +${ex.muscles.length - 1} more`}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-subtle" />
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
                className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-input text-sm font-semibold text-primary transition-colors hover:border-primary disabled:opacity-50"
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
