"use client";

import { CONTRACTION_LABELS } from "@/lib/workout-sets";
import { cn } from "@/lib/utils";

/**
 * Optional 0–5 "how well did the muscle contract" score, as a segmented row.
 * 0 = felt nothing. Tapping the selected value again clears it.
 */
export function ContractionPicker({
  value,
  onChange,
  compact = false,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Smaller variant for the inline edit form. */
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("label-caps", compact && "text-[10px]")}>Contraction · optional</span>
        <span className="text-[13px] font-semibold text-foreground">
          {value != null ? CONTRACTION_LABELS[value] : <span className="font-normal text-subtle">0 = felt nothing</span>}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label="How well the muscle contracted, 0 felt nothing to 5 excellent"
        className="grid grid-cols-6 gap-1 rounded-full border border-input bg-background p-1"
      >
        {CONTRACTION_LABELS.map((label, n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${n}, ${label}`}
              onClick={() => onChange(selected ? null : n)}
              className={cn(
                "num flex items-center justify-center rounded-full transition-colors",
                compact ? "h-9 text-lg" : "h-10 text-xl",
                selected ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
