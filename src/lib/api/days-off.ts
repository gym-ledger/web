import { apiClient } from "@/lib/api-client";

/** Mirrors DAY_OFF_CATEGORIES in the API (userDaysOff.schema.ts). */
export const DAY_OFF_CATEGORIES = [
  { value: "sick", label: "Sick / unwell" },
  { value: "injury", label: "Injury / pain" },
  { value: "low_energy", label: "Low energy / poor sleep" },
  { value: "sore", label: "Sore / need recovery" },
  { value: "travel", label: "Travel / no gym access" },
  { value: "work", label: "Work / study" },
  { value: "family", label: "Family / personal" },
  { value: "other", label: "Other" },
] as const;

export type DayOffCategory = (typeof DAY_OFF_CATEGORIES)[number]["value"];

export const DAY_OFF_NOTE_MAX = 280;

export function dayOffCategoryLabel(category: DayOffCategory) {
  return DAY_OFF_CATEGORIES.find((c) => c.value === category)?.label ?? "Day off";
}

/** The 10-in-30 rule and the marking window, as the API states them. */
export interface DayOffAllowance {
  limit: number;
  window_days: number;
  /** Counted days off in the 30 days ending today. */
  used_in_window: number;
  /** Earliest / latest day that can be marked (YYYY-MM-DD). */
  earliest_date: string;
  latest_date: string;
}

export interface MarkDaysOffResult {
  days: { date: string; protects_streak: boolean; already_marked: boolean }[];
  skipped: { date: string; reason: "not_planned" | "trained" }[];
  allowance: DayOffAllowance;
}

export interface MarkDaysOffInput {
  start_date: string;
  end_date?: string;
  category: DayOffCategory;
  note?: string | null;
}

/** Marks every planned, untrained day from start to end. */
export function markDaysOff(input: MarkDaysOffInput) {
  return apiClient.post<MarkDaysOffResult>("/user/days-off", input);
}

/** What `markDaysOff` would do, without saving. */
export function previewDaysOff(input: MarkDaysOffInput) {
  return apiClient.post<MarkDaysOffResult>("/user/days-off", { ...input, dry_run: true });
}

export function removeDayOff(date: string) {
  return apiClient.delete<null>(`/user/days-off/${date}`);
}

// ---------------------------------------------------------------------------
// Local calendar days (YYYY-MM-DD), matching the API's day strings.
// ---------------------------------------------------------------------------

export function localDateIso(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

/** Mirrors the API's DAY_OFF_BACKFILL_DAYS / DAY_OFF_MAX_FUTURE_DAYS; the API has the final say. */
export const DAY_OFF_BACKFILL_DAYS = 2;
export const DAY_OFF_MAX_FUTURE_DAYS = 60;
