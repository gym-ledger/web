"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveSet } from "@/types";

interface SetRowProps {
  set: ActiveSet;
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
  onRirChange: (rir: number) => void;
  onComplete: () => void;
}

export function SetRow({
  set,
  onWeightChange,
  onRepsChange,
  onRirChange,
  onComplete,
}: SetRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors",
        set.completed ? "bg-primary/8" : "bg-secondary/40"
      )}
    >
      {/* Set number */}
      <span className="w-5 text-center text-sm font-semibold text-muted-foreground shrink-0">
        {set.setNumber}
      </span>

      {/* Previous */}
      <div className="w-14 text-center shrink-0">
        {set.previousWeight && set.previousReps ? (
          <span className="text-xs text-muted-foreground leading-tight">
            {set.previousWeight}×{set.previousReps}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </div>

      {/* Weight input */}
      <div className="flex flex-1 items-center gap-1">
        <input
          type="number"
          value={set.weight || ""}
          onChange={(e) => onWeightChange(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className={cn(
            "w-full min-w-0 rounded-lg border px-2 py-1.5 text-center text-sm font-semibold tabular-nums outline-none transition-colors",
            "border-border bg-background/60 text-foreground",
            "focus:border-primary focus:ring-1 focus:ring-primary/30",
            set.completed && "opacity-60"
          )}
          disabled={set.completed}
        />
        <span className="text-xs text-muted-foreground shrink-0">kg</span>
      </div>

      {/* Reps input */}
      <input
        type="number"
        value={set.reps || ""}
        onChange={(e) => onRepsChange(parseInt(e.target.value) || 0)}
        placeholder="0"
        className={cn(
          "w-12 shrink-0 rounded-lg border px-1.5 py-1.5 text-center text-sm font-semibold tabular-nums outline-none transition-colors",
          "border-border bg-background/60 text-foreground",
          "focus:border-primary focus:ring-1 focus:ring-primary/30",
          set.completed && "opacity-60"
        )}
        disabled={set.completed}
      />

      {/* RIR input */}
      <input
        type="number"
        value={set.rir ?? ""}
        onChange={(e) => onRirChange(parseInt(e.target.value) || 0)}
        placeholder="—"
        min={0}
        max={5}
        className={cn(
          "w-10 shrink-0 rounded-lg border px-1 py-1.5 text-center text-sm font-semibold tabular-nums outline-none transition-colors",
          "border-border bg-background/60 text-foreground",
          "focus:border-primary focus:ring-1 focus:ring-primary/30",
          set.completed && "opacity-60"
        )}
        disabled={set.completed}
      />

      {/* Complete button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onComplete}
        disabled={set.completed}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all",
          set.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-transparent text-muted-foreground hover:border-primary/60 hover:text-primary"
        )}
      >
        <motion.div
          animate={set.completed ? { scale: [1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Check className="size-4" strokeWidth={2.5} />
        </motion.div>
      </motion.button>
    </motion.div>
  );
}
