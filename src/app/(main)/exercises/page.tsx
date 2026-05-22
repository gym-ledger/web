"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronRight, Dumbbell, Settings2, Link2, User, Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { exercises, muscleGroups } from "@/lib/data/exercises";
import { cn } from "@/lib/utils";

const difficultyColors = {
  beginner: "text-emerald-400 bg-emerald-400/10",
  intermediate: "text-yellow-400 bg-yellow-400/10",
  advanced: "text-red-400 bg-red-400/10",
};

const equipmentIcons: Record<string, React.ElementType> = {
  barbell: Dumbbell,
  dumbbell: Dumbbell,
  machine: Settings2,
  cable: Link2,
  bodyweight: User,
  kettlebell: Gauge,
  "ez-bar": Dumbbell,
};

function muscleFilterMatch(exercise: typeof exercises[0], filter: string) {
  if (filter === "All") return true;
  const f = filter.toLowerCase();
  if (f === "arms") {
    return (
      exercise.primaryMuscle === "biceps" ||
      exercise.primaryMuscle === "triceps" ||
      exercise.primaryMuscle === "forearms"
    );
  }
  return (
    exercise.primaryMuscle === f ||
    exercise.secondaryMuscles.includes(f as never)
  );
}

export default function ExercisesPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        !query ||
        ex.name.toLowerCase().includes(query.toLowerCase()) ||
        ex.primaryMuscle.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = muscleFilterMatch(ex, activeFilter);
      return matchesSearch && matchesFilter;
    });
  }, [query, activeFilter]);

  return (
    <div className="flex flex-col pt-4">
      <div className="px-4">
        <PageHeader title="Exercises" subtitle={`${exercises.length} exercises`} />
      </div>

      {/* Sticky search + filters */}
      <div className="sticky top-0 z-30 bg-background px-4 pb-3 pt-1">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exercises..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 rounded-xl pl-9 text-base"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {muscleGroups.map((group) => (
            <button
              key={group}
              onClick={() => setActiveFilter(group)}
              className={cn(
                "shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors",
                activeFilter === group
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              )}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-2 px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Search className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No exercises found for &quot;{query}&quot;</p>
          </div>
        ) : (
          filtered.map((ex, i) => {
            const EquipIcon = equipmentIcons[ex.equipment] ?? Dumbbell;
            return (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Link href={`/exercises/${ex.id}`}>
                <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10 hover:ring-primary/30 transition-all">
                  {/* Equipment icon */}
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <EquipIcon className="size-5 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {ex.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">
                        {ex.primaryMuscle}
                      </span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {ex.equipment}
                      </span>
                    </div>
                  </div>

                  {/* Difficulty + arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-xs font-medium rounded-lg px-2 py-0.5 capitalize",
                        difficultyColors[ex.difficulty]
                      )}
                    >
                      {ex.difficulty}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
