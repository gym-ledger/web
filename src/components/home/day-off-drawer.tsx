"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import {
  DAY_OFF_BACKFILL_DAYS,
  DAY_OFF_CATEGORIES,
  DAY_OFF_MAX_FUTURE_DAYS,
  DAY_OFF_NOTE_MAX,
  addDaysIso,
  localDateIso,
  markDaysOff,
  previewDaysOff,
  removeDayOff,
  type DayOffCategory,
  type MarkDaysOffResult,
} from "@/lib/api/days-off";
import { cn } from "@/lib/utils";

/** An existing day off being changed; the drawer then edits that one day. */
export interface DayOffDrawerEditing {
  date: string;
  category: DayOffCategory;
  note: string | null;
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function joinDays(days: string[]) {
  const shown = days.slice(0, 4).map(formatDay);
  return days.length > 4 ? `${shown.join(", ")} and ${days.length - 4} more` : shown.join(", ");
}

export function DayOffDrawer({
  open,
  initialDate,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** The day the drawer opens on (today, or the week-strip day tapped). */
  initialDate: string;
  editing: DayOffDrawerEditing | null;
  onClose: () => void;
  /** After any save or removal, so Home can reload its stats. */
  onSaved: () => void;
}) {
  const today = localDateIso();
  const minDate = addDaysIso(today, -DAY_OFF_BACKFILL_DAYS);
  const maxDate = addDaysIso(today, DAY_OFF_MAX_FUTURE_DAYS);

  // The parent remounts this component (a new `key`) each time it opens,
  // so the form starts from these values.
  const [multi, setMulti] = useState(false);
  const [start, setStart] = useState(editing?.date ?? initialDate);
  const [end, setEnd] = useState(editing?.date ?? initialDate);
  const [category, setCategory] = useState<DayOffCategory | null>(editing?.category ?? null);
  const [note, setNote] = useState(editing?.note ?? "");
  const [previewState, setPreviewState] = useState<{
    key: string;
    result: MarkDaysOffResult | null;
    error: string | null;
  } | null>(null);
  const [saving, setSaving] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rangeEnd = multi ? end : start;
  const datesValid = start >= minDate && rangeEnd <= maxDate && rangeEnd >= start;
  const previewKey = `${start}/${rangeEnd}`;
  // Only the answer for the dates now picked counts; older ones read as loading.
  const current = previewState?.key === previewKey ? previewState : null;
  const preview = current?.result ?? null;
  const previewError = current?.error ?? null;

  // Ask the API which days the range would mark and whether they stay within
  // the allowance. Category doesn't change the answer, so a stand-in is used.
  useEffect(() => {
    if (!open || !datesValid) return;
    let cancelled = false;
    const key = `${start}/${rangeEnd}`;
    const timer = setTimeout(() => {
      previewDaysOff({ start_date: start, end_date: rangeEnd, category: "sick" })
        .then((result) => {
          if (!cancelled) setPreviewState({ key, result, error: null });
        })
        .catch((err) => {
          if (!cancelled) {
            setPreviewState({
              key,
              result: null,
              error: err instanceof ApiError ? err.message : "Couldn't check these dates",
            });
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, start, rangeEnd, datesValid]);

  const days = preview?.days.map((d) => d.date) ?? [];
  const unprotected = preview?.days.filter((d) => !d.protects_streak).map((d) => d.date) ?? [];
  const trimmedNote = note.trim();
  const noteMissing = category === "other" && !trimmedNote;
  const canSave = !!category && !noteMissing && days.length > 0 && saving == null;

  async function handleSave() {
    if (!category || !canSave) return;
    setSaving("save");
    setError(null);
    try {
      const result = await markDaysOff({
        start_date: start,
        end_date: rangeEnd,
        category,
        note: trimmedNote || null,
      });
      const n = result.days.length;
      toast.success(
        result.days.every((d) => d.protects_streak)
          ? n === 1
            ? "Day off saved. Your streak is safe."
            : `${n} days off saved. Your streak is safe.`
          : n === 1
            ? "Day off saved."
            : `${n} days off saved.`,
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the day off");
    } finally {
      setSaving(null);
    }
  }

  async function handleRemove() {
    if (!editing) return;
    setSaving("remove");
    setError(null);
    try {
      await removeDayOff(editing.date);
      toast.success("Day off removed");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove the day off");
    } finally {
      setSaving(null);
    }
  }

  const saveLabel = editing
    ? "Save changes"
    : days.length > 1
      ? `Take ${days.length} days off`
      : "Take the day off";

  return (
    <Drawer open={open} onOpenChange={(v) => !v && saving == null && onClose()}>
      <DrawerContent>
        <div className="overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>{editing ? "Change day off" : "Take a day off"}</DrawerTitle>
            <p className="text-sm text-muted-foreground">
              Planned days you take off don&apos;t break your streak, up to {preview?.allowance.limit ?? 10} in any{" "}
              {preview?.allowance.window_days ?? 30} days.
            </p>
          </DrawerHeader>

          <div className="flex flex-col gap-5 px-4 pb-2">
            {!editing && (
              <div
                role="radiogroup"
                aria-label="How many days"
                className="flex rounded-full border border-input bg-background p-1"
              >
                {[
                  { value: false, label: "One day" },
                  { value: true, label: "Several days" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={multi === opt.value}
                    onClick={() => {
                      setMulti(opt.value);
                      if (opt.value && end < start) setEnd(start);
                    }}
                    className={cn(
                      "h-9 flex-1 rounded-full text-[13px] font-semibold transition-colors",
                      multi === opt.value ? "bg-foreground text-background" : "text-muted-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {editing ? (
              <p className="text-[15px] font-semibold">{formatDay(editing.date)}</p>
            ) : (
              <div className={cn("grid gap-2", multi ? "grid-cols-2" : "grid-cols-1")}>
                <label className="flex flex-col gap-1.5">
                  <span className="label-caps">{multi ? "From" : "Day"}</span>
                  <input
                    type="date"
                    value={start}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => {
                      setStart(e.target.value);
                      if (end < e.target.value) setEnd(e.target.value);
                    }}
                    className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                {multi && (
                  <label className="flex flex-col gap-1.5">
                    <span className="label-caps">To</span>
                    <input
                      type="date"
                      value={end}
                      min={start}
                      max={maxDate}
                      onChange={(e) => setEnd(e.target.value)}
                      className="h-11 min-w-0 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                )}
              </div>
            )}

            {!editing && (
              <div aria-live="polite" className="-mt-2 text-[13px]">
                {!datesValid ? (
                  <p className="text-destructive">
                    Pick days from {formatDay(minDate)} up to {formatDay(maxDate)}.
                  </p>
                ) : previewError ? (
                  <p className="text-destructive">{previewError}</p>
                ) : preview == null ? (
                  <p className="text-muted-foreground">Checking your plan…</p>
                ) : days.length === 0 ? (
                  <p className="text-muted-foreground">
                    {preview.skipped.some((s) => s.reason === "trained")
                      ? "You already trained on the planned days here."
                      : "No planned training days here, so there's nothing to take off."}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    {days.length === 1 ? "Planned day: " : `${days.length} planned days: `}
                    <span className="text-foreground">{joinDays(days)}</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="label-caps">Reason</span>
              <div role="radiogroup" aria-label="Reason" className="flex flex-wrap gap-2">
                {DAY_OFF_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={category === c.value}
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      "h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                      category === c.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-input bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="label-caps">{category === "other" ? "Note" : "Note (optional)"}</span>
              <textarea
                value={note}
                maxLength={DAY_OFF_NOTE_MAX}
                rows={2}
                onChange={(e) => setNote(e.target.value)}
                placeholder={category === "other" ? "What's going on?" : "Anything you want to remember"}
                className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-subtle focus:border-primary"
              />
              <span className="text-[11px] text-subtle">Only you see this note. It&apos;s never sent to the AI check-in.</span>
            </label>

            {unprotected.length > 0 && (
              <div className="rounded-xl border border-warning-line bg-warning-surface px-3.5 py-3 text-[13px]">
                <p className="font-semibold text-warning">Past your limit</p>
                <p className="mt-0.5 text-muted-foreground">
                  {unprotected.length === days.length && days.length === 1
                    ? "This day"
                    : `${joinDays(unprotected)}`}{" "}
                  would be more than {preview?.allowance.limit} days off in {preview?.allowance.window_days} days, so{" "}
                  {unprotected.length === 1 ? "it won't" : "they won't"} protect your streak. You can still save{" "}
                  {unprotected.length === 1 ? "it" : "them"}.
                </p>
              </div>
            )}

            {preview && (
              <p className="text-[13px] text-muted-foreground">
                <span className="num text-base text-foreground">{preview.allowance.used_in_window}</span> of{" "}
                {preview.allowance.limit} days off used in the last {preview.allowance.window_days} days
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DrawerFooter>
            <Button type="button" size="xl" disabled={!canSave} onClick={handleSave}>
              {saving === "save" && <Loader2 className="animate-spin" />}
              {saveLabel}
            </Button>
            {editing ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving != null}
                className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-destructive transition-opacity disabled:opacity-50"
              >
                {saving === "remove" && <Loader2 className="size-4 animate-spin" />}
                Remove day off
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={saving != null}
                className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
