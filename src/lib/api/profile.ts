import { apiClient } from "@/lib/api-client";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  email: string | null;
  /** False for users who have only ever signed in with a one-time code — they can set a password without the current one. */
  has_password: boolean;
  /** Set once the user finishes or skips onboarding; null sends them to it. */
  onboarded_at: string | null;
  created_at: string;
}

export type WeightUnits = "kg" | "lbs";
export type HeightUnits = "cm" | "ft";

export type TrainingGoal = "build_muscle" | "get_stronger" | "lose_fat" | "general_fitness";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Equipment = "full_gym" | "home_dumbbells" | "bodyweight";

export interface UserPreferences {
  timezone: string;
  weight_units: WeightUnits;
  height_units: HeightUnits;
  height: number;
  /** Onboarding answers — null for users who skipped it or predate it. */
  training_goal?: TrainingGoal | null;
  experience_level?: ExperienceLevel | null;
  training_days_per_week?: number | null;
  equipment?: Equipment | null;
}

export type OnboardingAnswers = Required<{
  [K in keyof UserPreferences]: NonNullable<UserPreferences[K]>;
}>;

export async function fetchProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>("/user/profile");
}

/** `lastName` null or "" clears it. */
export async function updateName(data: { firstName: string; lastName: string | null }): Promise<UserProfile> {
  return apiClient.put<UserProfile>("/user/profile/name", data);
}

/** `currentPassword` is required only when the user already has a password. */
export async function changePassword(data: { currentPassword?: string; newPassword: string }): Promise<void> {
  await apiClient.put<null>("/user/profile/password", data);
}

/** `null` until the user has saved preferences once — the first save must send every field. */
export async function fetchPreferences(): Promise<UserPreferences | null> {
  const res = await apiClient.get<{ preferences: UserPreferences | null }>("/user/profile/preferences");
  return res.preferences;
}

export async function updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await apiClient.put<{ preferences: UserPreferences }>("/user/profile/preferences", data);
  return res.preferences;
}

/** Saves every onboarding answer (creating the preferences row if needed) and marks the user onboarded. */
export async function completeOnboarding(
  data: OnboardingAnswers,
): Promise<{ user: UserProfile; preferences: UserPreferences }> {
  return apiClient.put<{ user: UserProfile; preferences: UserPreferences }>("/user/profile/onboarding", data);
}

/** Marks the user onboarded without saving any answers. */
export async function skipOnboarding(): Promise<UserProfile> {
  return apiClient.post<UserProfile>("/user/profile/onboarding/skip");
}

// ---------------------------------------------------------------------------
// Body-weight goal — see workout-gym-api/algorithms/weekly-checkin.md §5
// ---------------------------------------------------------------------------

export type WeightGoalType = "lose" | "maintain" | "gain";
export type WeightGoalPresetKey = "mild_cut" | "extreme_cut" | "clean_bulk" | "dirty_bulk";
/** A preset, or "custom" for a pace the user types in. */
export type WeightGoalPace = WeightGoalPresetKey | "custom";
/** A custom pace in % of body weight, or in the user's weight units, per week. */
export type CustomPaceUnit = "pct" | "weight";

export interface WeightGoalPreset {
  key: WeightGoalPresetKey;
  label: string;
  direction: "lose" | "gain";
  /** Signed target pace, % of body weight per week. */
  weekly_pct: number;
  min_weekly_pct: number;
  max_weekly_pct: number;
  daily_kcal: string;
  description: string;
}

export type WeightGoalStatus = "active" | "completed" | "finished_early" | "cancelled";
export type WeightGoalEndStatus = Exclude<WeightGoalStatus, "active">;

/** Same verdicts as the weekly check-in. */
export type WeightPaceStatus =
  | "no_goal"
  | "not_enough_data"
  | "goal_reached"
  | "on_track"
  | "behind"
  | "too_fast"
  | "wrong_direction"
  | "drifting_up"
  | "drifting_down";

export interface WeightGoalTrajectory {
  /** Where the straight-line plan puts the user today. */
  planned_weight_today: number | null;
  /** Measured trend per week, signed; null until 4 weigh-ins over 10+ days. */
  actual_weekly_change: number | null;
  actual_weekly_pct: number | null;
  pace_status: WeightPaceStatus;
  /** The date the measured trend reaches the target; null if it isn't heading there. */
  projected_date: string | null;
  /** 0–1 of the way from the start weight to the target. */
  progress: number | null;
}

export interface WeightGoal {
  id: string;
  status: WeightGoalStatus;
  goal: WeightGoalType;
  preset: WeightGoalPace | null;
  /** Unsigned, only for a custom pace. */
  custom_pace: number | null;
  custom_pace_unit: CustomPaceUnit | null;
  /** Signed pace chosen, % of body weight per week at the current weight. */
  pace_weekly_pct: number | null;
  target_weight: number | null;
  /** "Goal starts from". */
  start_date: string;
  /** 7-day average as of the start date. */
  start_weight: number | null;
  goal_date: string | null;
  goal_date_source: "suggested" | "user" | null;
  weeks_left: number | null;
  /** Signed % of body weight per week still needed to hit the target by the date. */
  required_weekly_pct: number | null;
  /** The date needs a pace faster than any preset allows. */
  pace_warning: boolean;
  trajectory: WeightGoalTrajectory;
  target_reached: boolean;
  date_passed: boolean;
  /** "Mark complete" is offered once the date passes or the target is reached (maintain: any time). */
  can_complete: boolean;
}

export interface WeightGoalEndReason {
  key: string;
  label: string;
  description: string;
}

export interface WeightGoalState {
  goal: WeightGoal | null;
  /** Goals need the preferences row (units, timezone) — they can't be saved until it exists. */
  has_preferences: boolean;
  weight_units: WeightUnits;
  /** Mean of the weigh-ins in the 7 days up to the latest one; null with no weigh-ins. */
  current_weight: { weight: number; as_of: string } | null;
  /** Today in the user's timezone. */
  today: string;
  presets: WeightGoalPreset[];
  /** Fastest custom pace the API accepts, % of body weight per week. */
  max_custom_weekly_pct: number;
  end_reasons: Record<"finished_early" | "cancelled", WeightGoalEndReason[]>;
}

export interface GoalDateSuggestion {
  preset: WeightGoalPace;
  start_date: string;
  goal_date: string;
  /** A backdated start can put the suggested date in the past. */
  goal_date_passed: boolean;
  weeks: number;
  start_weight: number;
  target_weight: number;
  /** Signed change per week at the chosen pace, in the user's units. */
  weekly_change: number;
  /** Same, as % of body weight. */
  weekly_pct: number;
  weight_units: WeightUnits;
}

/** An ended goal. */
export interface WeightGoalHistoryEntry {
  id: string;
  status: WeightGoalEndStatus;
  goal: WeightGoalType;
  preset: WeightGoalPace | null;
  custom_pace: number | null;
  custom_pace_unit: CustomPaceUnit | null;
  target_weight: number | null;
  start_date: string;
  start_weight: number | null;
  goal_date: string | null;
  end_date: string;
  end_weight: number | null;
  end_reason: string | null;
  end_note: string | null;
  /** Signed, end weight minus start weight. */
  change: number | null;
  /** 0–1 of the way from the start weight to the target. */
  progress: number | null;
  weeks: number | null;
}

export async function fetchWeightGoal(): Promise<WeightGoalState> {
  return apiClient.get<WeightGoalState>("/user/profile/goal");
}

export type GoalPaceInput =
  | { preset: WeightGoalPresetKey }
  | { preset: "custom"; custom_pace: number; custom_pace_unit: CustomPaceUnit };

export async function suggestGoalDate(
  pace: GoalPaceInput,
  targetWeight: number,
  startDate: string,
): Promise<GoalDateSuggestion> {
  const params = new URLSearchParams({ preset: pace.preset, target_weight: String(targetWeight), start_date: startDate });
  if (pace.preset === "custom") {
    params.set("custom_pace", String(pace.custom_pace));
    params.set("custom_pace_unit", pace.custom_pace_unit);
  }
  return apiClient.get<GoalDateSuggestion>(`/user/profile/goal/suggestion?${params}`);
}

/**
 * Edits the active goal, or starts one when there is none. Without
 * `goal_date` the API uses the pace's suggested date. "maintain" takes no
 * pace/target/date.
 */
export async function saveWeightGoal(
  data: { start_date: string } & (
    | { goal: "maintain" }
    | ({ goal: "lose" | "gain"; target_weight: number; goal_date?: string | null } & GoalPaceInput)
  ),
): Promise<WeightGoal> {
  const res = await apiClient.put<{ goal: WeightGoal }>("/user/profile/goal", data);
  return res.goal;
}

/** "completed" needs `can_complete`; the others take an optional reason and note. */
export async function endWeightGoal(data: {
  status: WeightGoalEndStatus;
  reason?: string | null;
  note?: string | null;
}): Promise<WeightGoalHistoryEntry> {
  const res = await apiClient.post<{ goal: WeightGoalHistoryEntry }>("/user/profile/goal/end", data);
  return res.goal;
}

export async function fetchWeightGoalHistory(): Promise<WeightGoalHistoryEntry[]> {
  const res = await apiClient.get<{ goals: WeightGoalHistoryEntry[] }>("/user/profile/goal/history");
  return res.goals;
}
