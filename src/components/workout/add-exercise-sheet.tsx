"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Plus, X } from "lucide-react";
import { fetchExercises, type ExerciseListItem } from "@/lib/api/exercises";

const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 20;

export function AddExerciseSheet({
  open,
  busy,
  onClose,
  onPick,
  inSessionExerciseIds,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseListItem) => void;
  /** Catalog exercise ids already in the live session — flagged in results, still pickable. */
  inSessionExerciseIds?: Set<string>;
}) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseListItem[]>([]);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setQuery(rawQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [open, rawQuery]);

  // `open` conditionally unmounts this whole component (see the `open &&`
  // guard below), so search state naturally resets on remount — no explicit
  // reset-on-close effect needed.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    startTransition(async () => {
      try {
        const res = await fetchExercises({ search: query || undefined, limit: RESULT_LIMIT });
        if (cancelled) return;
        setResults(res.data);
      } catch {
        if (!cancelled) setResults([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-exercise-title"
            className="flex max-h-[85vh] w-full max-w-md flex-col gap-3.5 rounded-t-3xl border-t border-input bg-card px-4 pt-2.5 pb-6"
          >
            <div className="mx-auto h-1 w-11 shrink-0 rounded-full bg-input" />
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div>
                <h2 id="add-exercise-title" className="font-display text-2xl font-bold">
                  Add exercise
                </h2>
                <p className="text-sm text-muted-foreground">Not on the plan? Log a substitute for this session.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <label className="flex h-[50px] shrink-0 items-center gap-2.5 rounded-[14px] border border-input bg-background px-3.5 focus-within:border-primary">
              <Search className="size-[18px] shrink-0 text-muted-foreground" />
              <input
                type="search"
                autoFocus
                aria-label="Search exercises"
                placeholder="Search exercises…"
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle"
              />
              {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
            </label>

            <div className="flex-1 overflow-y-auto">
              {loading && results.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No exercises found{query ? ` for "${query}"` : ""}
                </p>
              ) : (
                <div className="flex flex-col gap-2 pb-2">
                  {query && <span className="label-caps">{results.length} results</span>}
                  {results.map((ex) => {
                    const inSession = inSessionExerciseIds?.has(ex.id) ?? false;
                    const primaryMuscle = [...ex.muscles].sort((a, b) => b.contribution - a.contribution)[0];
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        disabled={busy}
                        onClick={() => onPick(ex)}
                        className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2 text-left transition-colors hover:border-input disabled:opacity-50"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-base font-bold">{ex.name}</span>
                          {(primaryMuscle || inSession) && (
                            <span className="truncate text-[13px] text-muted-foreground">
                              {primaryMuscle?.name}
                              {primaryMuscle && inSession && " · "}
                              {inSession && "already in this session"}
                            </span>
                          )}
                        </span>
                        <Plus className="size-[18px] text-primary" strokeWidth={2.4} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
