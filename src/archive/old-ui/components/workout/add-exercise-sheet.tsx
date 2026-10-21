"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Dumbbell, Loader2 } from "lucide-react";
import { Input } from "@/archive/old-ui/components/ui/input";
import { fetchExercises, type ExerciseListItem } from "@/lib/api/exercises";

const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 20;

export function AddExerciseSheet({
  open,
  busy,
  onClose,
  onPick,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseListItem) => void;
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col rounded-t-3xl bg-card p-6 pb-4 ring-1 ring-foreground/10 max-h-[85vh]"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border shrink-0" />
            <h2 className="text-lg font-bold text-foreground shrink-0">Add exercise</h2>
            <p className="mt-1 text-sm text-muted-foreground shrink-0">
              Not on the plan? Log a substitute for this session.
            </p>

            <div className="relative mt-4 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="search"
                autoFocus
                placeholder="Search exercises..."
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                className="h-11 rounded-xl pl-9 text-base"
              />
            </div>

            <div className="mt-3 flex-1 overflow-y-auto">
              {loading && results.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Search className="size-7 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No exercises found{query ? ` for "${query}"` : ""}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-2">
                  {results.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onPick(ex)}
                      className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-3 text-left ring-1 ring-foreground/10 hover:bg-secondary/70 transition-colors disabled:opacity-50"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Dumbbell className="size-4.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                        {ex.muscles[0] && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {ex.muscles[0].name}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
