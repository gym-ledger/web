"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import {
  endWeightGoal,
  type WeightGoalEndStatus,
  type WeightGoalHistoryEntry,
  type WeightGoalState,
} from "@/lib/api/profile";
import { cn } from "@/lib/utils";

function fmt(w: number) {
  return w % 1 === 0 ? `${w}` : w.toFixed(1);
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Stopping a cut or bulk early is a normal, often smart call. Every line
// here is worded so it never reads as failing.
const DONE_TOAST: Record<WeightGoalEndStatus, string> = {
  completed: "Goal complete. Great work.",
  finished_early: "Saved to your goal history. Pick up again whenever you're ready.",
  cancelled: "Goal closed. Set a new one whenever you like.",
};

/** What the user has achieved so far, always framed as progress kept. */
export function progressLine(state: WeightGoalState): string {
  const goal = state.goal;
  const current = state.current_weight?.weight ?? null;
  if (!goal || goal.start_weight == null || current == null) return "Every week you tracked counts.";
  const weeks = Math.max(1, Math.round((Date.parse(state.today) - Date.parse(goal.start_date)) / (7 * 86_400_000)));
  const span = `${weeks} week${weeks === 1 ? "" : "s"}`;
  if (goal.goal === "maintain") return `${span} of holding steady. That's a skill.`;
  const moved = (goal.goal === "lose" ? goal.start_weight - current : current - goal.start_weight);
  if (moved >= 0.1) {
    return `You've moved ${fmt(Math.round(moved * 10) / 10)} ${state.weight_units} toward your target in ${span}. That progress is yours to keep.`;
  }
  return `${span} of tracking. That habit is the foundation for whatever comes next.`;
}

/**
 * Ends the active goal: "Mark complete" once the date passes or the target
 * is reached, otherwise "Finish early" or "Cancel goal" with an optional
 * reason and note. The goal moves to the history either way.
 */
export function EndWeightGoalDrawer({
  open,
  state,
  onClose,
  onEnded,
}: {
  open: boolean;
  state: WeightGoalState;
  onClose: () => void;
  onEnded: (ended: WeightGoalHistoryEntry) => void;
}) {
  const [choice, setChoice] = useState<WeightGoalEndStatus | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChoice(state.goal?.can_complete ? "completed" : null);
      setReason(null);
      setNote("");
      setError(null);
    }
  }

  const goal = state.goal;
  if (!goal) return null;
  const units = state.weight_units;

  const completeHint =
    goal.target_weight != null && goal.goal_date
      ? `Opens when you reach ${fmt(goal.target_weight)} ${units} or on ${formatDate(goal.goal_date)}.`
      : "Opens when you reach your target or the goal date.";

  const options: { value: WeightGoalEndStatus; label: string; description: string; disabled?: boolean }[] = [
    {
      value: "completed",
      label: "Mark complete",
      description: goal.can_complete
        ? goal.target_reached
          ? "You reached your target."
          : goal.goal === "maintain"
            ? "Wrap up this maintenance phase."
            : "You saw this phase through to its date."
        : completeHint,
      disabled: !goal.can_complete,
    },
    {
      value: "finished_early",
      label: "Finish early",
      description: "Step back for now, e.g. a few weeks at maintenance. You can start a new goal any time.",
    },
    {
      value: "cancelled",
      label: "Cancel goal",
      description: "This goal wasn't the right fit. No problem, set one that is.",
    },
  ];

  const reasons = choice && choice !== "completed" ? state.end_reasons[choice] : [];

  async function handleConfirm() {
    if (!choice || saving) return;
    setSaving(true);
    setError(null);
    try {
      const ended = await endWeightGoal({
        status: choice,
        reason: choice === "completed" ? null : reason,
        note: note.trim() || null,
      });
      toast.success(DONE_TOAST[choice]);
      onEnded(ended);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update the goal");
    } finally {
      setSaving(false);
    }
  }

  const confirmLabel =
    choice === "completed" ? "Mark complete" : choice === "finished_early" ? "Finish goal" : "Cancel goal";

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <div className="overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>End this goal</DrawerTitle>
            <p className="text-sm text-muted-foreground">{progressLine(state)}</p>
          </DrawerHeader>

          <div className="flex flex-col gap-5 px-4 pb-2">
            <div role="radiogroup" aria-label="How did it go?" className="flex flex-col gap-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={choice === opt.value}
                  aria-disabled={opt.disabled}
                  disabled={opt.disabled}
                  onClick={() => {
                    setChoice(opt.value);
                    setReason(null);
                  }}
                  className={cn(
                    "flex min-h-[64px] items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                    choice === opt.value ? "border-primary bg-background" : "border-input bg-card hover:bg-secondary",
                    opt.disabled && "cursor-not-allowed opacity-60 hover:bg-card",
                  )}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{opt.label}</span>
                    <span className="text-[13px] text-muted-foreground">{opt.description}</span>
                  </span>
                  {choice === opt.value && <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />}
                </button>
              ))}
            </div>

            {reasons.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="label-caps">What&apos;s behind it? (optional)</span>
                <div className="flex flex-wrap gap-2">
                  {reasons.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      aria-pressed={reason === r.key}
                      title={r.description || undefined}
                      onClick={() => setReason(reason === r.key ? null : r.key)}
                      className={cn(
                        "h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                        reason === r.key
                          ? "border-foreground bg-foreground text-background"
                          : "border-input bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {reason && (
                  <p className="text-[13px] text-muted-foreground">
                    {reasons.find((r) => r.key === reason)?.description}
                  </p>
                )}
              </div>
            )}

            {choice && (
              <label className="flex flex-col gap-1.5">
                <span className="label-caps">Note for future you (optional)</span>
                <textarea
                  value={note}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    choice === "completed" ? "What worked well?" : "Anything you want to remember next time"
                  }
                  className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-subtle focus:border-primary"
                />
              </label>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DrawerFooter>
            <Button type="button" size="xl" disabled={!choice || saving} onClick={handleConfirm}>
              {saving && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Keep going
            </button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
