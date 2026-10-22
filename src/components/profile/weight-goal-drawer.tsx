"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import {
  saveWeightGoal,
  suggestGoalDate,
  type CustomPaceUnit,
  type GoalDateSuggestion,
  type GoalPaceInput,
  type WeightGoal,
  type WeightGoalPace,
  type WeightGoalState,
  type WeightGoalType,
} from "@/lib/api/profile";
import { cn } from "@/lib/utils";

// Same limits the API flags as unsafe (users.weightGoal.utils.ts there).
const UNSAFE_LOSS_PCT = 1.5;
const UNSAFE_GAIN_PCT = 1.0;

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmt(w: number) {
  return w % 1 === 0 ? `${w}` : w.toFixed(1);
}

function fmtPace(n: number, digits = 2) {
  return `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(digits).replace(/\.?0+$/, "")}`;
}

const GOAL_OPTIONS: { value: WeightGoalType; label: string }[] = [
  { value: "lose", label: "Lose" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain" },
];

/** One line for the settings row, e.g. "Mild cut to 76 kg by 25 Jan 2027". */
export function describeWeightGoal(state: WeightGoalState): string {
  const goal = state.goal;
  if (!goal) return "Not set";
  if (goal.goal === "maintain") return "Maintain current weight";
  const units = state.weight_units;
  const preset = state.presets.find((p) => p.key === goal.preset);
  const pace =
    goal.preset === "custom" && goal.custom_pace != null
      ? `${goal.goal === "lose" ? "−" : "+"}${fmt(goal.custom_pace)}${goal.custom_pace_unit === "pct" ? "%" : ` ${units}`}/wk`
      : (preset?.label ?? (goal.goal === "lose" ? "Cut" : "Bulk"));
  const target = goal.target_weight != null ? ` to ${fmt(goal.target_weight)} ${units}` : "";
  const by = goal.goal_date ? ` by ${formatDate(goal.goal_date)}` : "";
  return `${pace}${target}${by}`;
}

/**
 * Sets or edits the body-weight goal: direction, the date it starts from, a
 * pace (preset, or the user's own in % or weight per week), a target, and a
 * date — suggested by the API from the pace, or picked by the user.
 * `onEndRequest` offers ending the active goal (EndWeightGoalDrawer).
 */
export function WeightGoalDrawer({
  open,
  state,
  onClose,
  onSaved,
  onEndRequest,
}: {
  open: boolean;
  state: WeightGoalState;
  onClose: () => void;
  onSaved: (goal: WeightGoal) => void;
  onEndRequest?: () => void;
}) {
  const today = state.today;
  const [goal, setGoal] = useState<WeightGoalType>("lose");
  const [pace, setPace] = useState<WeightGoalPace>("mild_cut");
  const [customInput, setCustomInput] = useState("");
  const [customUnit, setCustomUnit] = useState<CustomPaceUnit>("pct");
  const [targetInput, setTargetInput] = useState("");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState(today);
  // Once the user picks their own date, a new suggestion no longer overwrites it.
  const [dateTouched, setDateTouched] = useState(false);
  const [suggestion, setSuggestion] = useState<GoalDateSuggestion | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from the saved goal each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const g = state.goal;
      setGoal(g?.goal ?? "lose");
      setPace(g?.preset ?? (g?.goal === "gain" ? "clean_bulk" : "mild_cut"));
      setCustomInput(g?.custom_pace != null ? String(g.custom_pace) : "");
      setCustomUnit(g?.custom_pace_unit ?? "pct");
      setTargetInput(g?.target_weight != null ? String(g.target_weight) : "");
      setDate(g?.goal_date ?? "");
      // A new goal starts today; an ongoing one keeps the date it started from.
      setStartDate(g?.start_date ?? today);
      setDateTouched(g?.goal_date_source === "user");
      setSuggestion(null);
      setSuggestError(null);
      setError(null);
    }
  }

  const units = state.weight_units;
  const current = state.current_weight?.weight ?? null;
  const presets = state.presets.filter((p) => p.direction === goal);
  const activePreset = presets.find((p) => p.key === pace) ?? null;
  const activePresetKey = activePreset?.key ?? null;
  const target = targetInput.trim() ? parseFloat(targetInput) : NaN;
  const targetValid = !Number.isNaN(target) && target > 0;
  const sign = goal === "lose" ? -1 : 1;

  const customValue = customInput.trim() ? Math.abs(parseFloat(customInput)) : NaN;
  // The custom pace as % of body weight, to check it and show the other unit.
  const customPct =
    Number.isNaN(customValue) || customValue === 0
      ? null
      : customUnit === "pct"
        ? customValue
        : current
          ? (customValue / current) * 100
          : null;
  const customTooFast = customPct != null && customPct > state.max_custom_weekly_pct;

  const paceInput: GoalPaceInput | null =
    pace === "custom"
      ? Number.isNaN(customValue) || customValue === 0
        ? null
        : { preset: "custom", custom_pace: customValue, custom_pace_unit: customUnit }
      : activePresetKey
        ? { preset: activePresetKey }
        : null;
  // A string, so the suggestion effect below only re-runs when the pace really changes.
  const paceKey = paceInput ? JSON.stringify(paceInput) : null;

  function selectGoal(next: WeightGoalType) {
    setGoal(next);
    if (next === "lose") setPace("mild_cut");
    if (next === "gain") setPace("clean_bulk");
    setSuggestion(null);
    setSuggestError(null);
  }

  // Ask the API for the date this pace reaches the target, after typing settles.
  useEffect(() => {
    if (!open || goal === "maintain" || !paceKey || customTooFast || !targetValid || current == null || !startDate) return;
    let cancelled = false;
    const t = setTimeout(() => {
      suggestGoalDate(JSON.parse(paceKey) as GoalPaceInput, target, startDate)
        .then((s) => {
          if (cancelled) return;
          setSuggestion(s);
          setSuggestError(null);
          if (!dateTouched && !s.goal_date_passed) setDate(s.goal_date);
        })
        .catch((err) => {
          if (cancelled) return;
          setSuggestion(null);
          setSuggestError(err instanceof ApiError ? err.message : "Couldn't suggest a date");
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, goal, paceKey, customTooFast, target, targetValid, current, dateTouched, startDate]);

  // Pace the chosen date actually needs, so a hand-picked date can be sanity-checked.
  const weeks = date ? (Date.parse(`${date}T00:00:00`) - Date.parse(`${today}T00:00:00`)) / (7 * 86_400_000) : 0;
  const impliedPct = current != null && targetValid && weeks > 0 ? ((target - current) / current) * 100 / weeks : null;
  const unsafe =
    impliedPct != null && ((impliedPct < 0 && -impliedPct > UNSAFE_LOSS_PCT) || (impliedPct > 0 && impliedPct > UNSAFE_GAIN_PCT));
  const usingSuggestion = suggestion != null && date === suggestion.goal_date;

  const minStart = addDaysISO(today, -365);
  const startValid = !!startDate && startDate <= today && startDate >= minStart;
  const canSave =
    state.has_preferences &&
    startValid &&
    (goal === "maintain" ||
      (current != null && paceInput != null && !customTooFast && targetValid && !suggestError && date > today));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved =
        goal === "maintain"
          ? await saveWeightGoal({ goal, start_date: startDate })
          : await saveWeightGoal({ goal, start_date: startDate, target_weight: target, goal_date: date, ...paceInput! });
      toast.success("Goal saved");
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save goal");
    } finally {
      setSaving(false);
    }
  }

  const paceOptionClass = (active: boolean) =>
    cn(
      "flex min-h-[72px] flex-col justify-between gap-1 rounded-xl border p-3 text-left transition-colors",
      active ? "border-primary bg-background" : "border-input bg-card hover:bg-secondary",
    );

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <form onSubmit={handleSave} className="overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>{state.goal ? "Edit goal" : "New goal"}</DrawerTitle>
            <p className="text-sm text-muted-foreground">
              {current != null
                ? `Now ${fmt(Math.round(current * 10) / 10)} ${units} (7-day average)`
                : "Log your body weight to set a cut or bulk."}
            </p>
          </DrawerHeader>

          <div className="flex flex-col gap-5 px-4 pb-2">
            {!state.has_preferences && (
              <p className="text-[13px] text-warning">Save your units and height above first.</p>
            )}

            <div role="radiogroup" aria-label="Goal" className="flex rounded-full border border-input bg-background p-1">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={goal === opt.value}
                  onClick={() => selectGoal(opt.value)}
                  className={cn(
                    "min-h-10 flex-1 rounded-full text-[13px] font-bold transition-colors",
                    goal === opt.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="goal-start" className="label-caps">
                Goal starts from
              </label>
              <input
                id="goal-start"
                type="date"
                value={startDate}
                min={minStart}
                max={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
              />
              {!startValid ? (
                <p className="text-[13px] text-destructive">Pick today or a date within the last year.</p>
              ) : suggestion && suggestion.start_date === startDate && startDate !== today ? (
                <p className="text-[13px] text-muted-foreground">
                  Measured from {fmt(Math.round(suggestion.start_weight * 10) / 10)} {units}, your average then.
                </p>
              ) : null}
            </div>

            {goal === "maintain" ? (
              <p className="text-[13px] text-muted-foreground">
                Your weekly check-in will flag it if your weight drifts more than 0.25% a week either way.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <span className="label-caps">Pace</span>
                  <div role="radiogroup" aria-label="Pace" className="grid grid-cols-3 gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        role="radio"
                        aria-checked={pace === p.key}
                        onClick={() => setPace(p.key)}
                        className={paceOptionClass(pace === p.key)}
                      >
                        <span className="text-[14px] leading-tight font-semibold">{p.label}</span>
                        <span className="num text-[18px] leading-none">
                          {fmtPace(p.weekly_pct)}
                          <span className="ml-0.5 text-[11px] text-muted-foreground">%/wk</span>
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={pace === "custom"}
                      onClick={() => setPace("custom")}
                      className={paceOptionClass(pace === "custom")}
                    >
                      <span className="text-[14px] leading-tight font-semibold">Custom</span>
                      <span className="text-[12px] text-muted-foreground">Your own pace</span>
                    </button>
                  </div>

                  {pace === "custom" ? (
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2">
                          <span className="num text-xl text-muted-foreground">{sign < 0 ? "−" : "+"}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.05"
                            aria-label={`Weekly pace in ${customUnit === "pct" ? "percent of body weight" : units}`}
                            placeholder="—"
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            className="num h-12 w-24 rounded-xl border border-input bg-background text-center text-2xl outline-none placeholder:text-subtle focus:border-primary"
                          />
                        </label>
                        <div
                          role="radiogroup"
                          aria-label="Pace unit"
                          className="flex rounded-full border border-input bg-background p-1"
                        >
                          {(
                            [
                              { value: "pct", label: "% / wk" },
                              { value: "weight", label: `${units} / wk` },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={customUnit === opt.value}
                              onClick={() => setCustomUnit(opt.value)}
                              className={cn(
                                "min-h-9 rounded-full px-3 text-[13px] font-bold transition-colors",
                                customUnit === opt.value
                                  ? "bg-foreground text-background"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {customTooFast ? (
                        <p className="text-[13px] text-destructive">
                          At most {state.max_custom_weekly_pct}% of body weight a week
                          {current ? ` (${fmt(Math.round(current * state.max_custom_weekly_pct) / 100)} ${units})` : ""}.
                        </p>
                      ) : customPct != null && current ? (
                        <p
                          className={cn(
                            "text-[13px]",
                            (sign < 0 ? customPct > UNSAFE_LOSS_PCT : customPct > UNSAFE_GAIN_PCT)
                              ? "text-warning"
                              : "text-muted-foreground",
                          )}
                        >
                          {customUnit === "pct"
                            ? `About ${fmt(Math.round(current * customPct) / 100)} ${units} a week now.`
                            : `About ${customPct.toFixed(2)}% of your body weight a week.`}
                          {(sign < 0 ? customPct > UNSAFE_LOSS_PCT : customPct > UNSAFE_GAIN_PCT) &&
                            " Faster than is healthy for most people."}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    activePreset && (
                      <p className="text-[13px] text-muted-foreground">
                        {activePreset.description} Roughly {activePreset.daily_kcal}.
                      </p>
                    )
                  )}
                </div>

                <label className="flex items-center justify-between gap-3">
                  <span className="label-caps">Target weight</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label={`Target weight in ${units}`}
                      placeholder="—"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      className="num h-12 w-28 rounded-xl border border-input bg-background text-center text-2xl outline-none placeholder:text-subtle focus:border-primary"
                    />
                    <span className="text-sm text-muted-foreground">{units}</span>
                  </span>
                </label>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="goal-date" className="label-caps">
                      Goal by
                    </label>
                    {suggestion && !usingSuggestion && (
                      <button
                        type="button"
                        onClick={() => {
                          setDate(suggestion.goal_date);
                          setDateTouched(false);
                        }}
                        className="min-h-9 text-[13px] font-semibold text-primary"
                      >
                        Use suggested ({formatDate(suggestion.goal_date)})
                      </button>
                    )}
                  </div>
                  <input
                    id="goal-date"
                    type="date"
                    value={date}
                    min={addDaysISO(today, 1)}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setDateTouched(true);
                    }}
                    className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
                  />
                  {suggestError ? (
                    <p className="text-[13px] text-destructive">{suggestError}</p>
                  ) : suggestion?.goal_date_passed && !date ? (
                    <p className="text-[13px] text-muted-foreground">
                      From that start, this pace would already have finished. Pick a date ahead.
                    </p>
                  ) : usingSuggestion ? (
                    <p className="text-[13px] text-muted-foreground">
                      Suggested: {suggestion.weeks} weeks at {fmtPace(suggestion.weekly_change, 1)} {units} a week.
                    </p>
                  ) : impliedPct != null ? (
                    <p className={cn("text-[13px]", unsafe ? "text-warning" : "text-muted-foreground")}>
                      Needs {fmtPace(impliedPct)}% a week
                      {unsafe ? " — faster than is healthy. Consider a later date." : "."}
                    </p>
                  ) : null}
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DrawerFooter>
            <Button type="submit" size="xl" disabled={!canSave || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Save goal
            </Button>
            {state.goal && onEndRequest ? (
              <button
                type="button"
                onClick={onEndRequest}
                disabled={saving}
                className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                End this goal
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
