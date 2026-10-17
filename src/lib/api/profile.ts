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
  created_at: string;
}

export type WeightUnits = "kg" | "lbs";
export type HeightUnits = "cm" | "ft";

export interface UserPreferences {
  timezone: string;
  weight_units: WeightUnits;
  height_units: HeightUnits;
  height: number;
}

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

export interface WeightGoal {
  goal: WeightGoalType;
  preset: WeightGoalPace | null;
  /** Unsigned, only for a custom pace. */
  custom_pace: number | null;
  custom_pace_unit: CustomPaceUnit | null;
  /** Signed pace chosen, % of body weight per week at the current weight. */
  pace_weekly_pct: number | null;
  target_weight: number | null;
  goal_date: string | null;
  goal_date_source: "suggested" | "user" | null;
  start_weight: number | null;
  set_on: string | null;
  weeks_left: number | null;
  /** Signed % of body weight per week still needed to hit the target by the date. */
  required_weekly_pct: number | null;
  /** The date needs a pace faster than any preset allows. */
  pace_warning: boolean;
}

export interface WeightGoalState {
  goal: WeightGoal | null;
  /** The goal lives on the preferences row — it can't be saved until units/height are. */
  has_preferences: boolean;
  weight_units: WeightUnits;
  /** Mean of the weigh-ins in the 7 days up to the latest one; null with no weigh-ins. */
  current_weight: { weight: number; as_of: string } | null;
  presets: WeightGoalPreset[];
  /** Fastest custom pace the API accepts, % of body weight per week. */
  max_custom_weekly_pct: number;
}

export interface GoalDateSuggestion {
  preset: WeightGoalPace;
  goal_date: string;
  weeks: number;
  current_weight: number;
  target_weight: number;
  /** Signed change per week at the chosen pace, in the user's units. */
  weekly_change: number;
  /** Same, as % of body weight. */
  weekly_pct: number;
  weight_units: WeightUnits;
}

export async function fetchWeightGoal(): Promise<WeightGoalState> {
  return apiClient.get<WeightGoalState>("/user/profile/goal");
}

export type GoalPaceInput =
  | { preset: WeightGoalPresetKey }
  | { preset: "custom"; custom_pace: number; custom_pace_unit: CustomPaceUnit };

export async function suggestGoalDate(pace: GoalPaceInput, targetWeight: number): Promise<GoalDateSuggestion> {
  const params = new URLSearchParams({ preset: pace.preset, target_weight: String(targetWeight) });
  if (pace.preset === "custom") {
    params.set("custom_pace", String(pace.custom_pace));
    params.set("custom_pace_unit", pace.custom_pace_unit);
  }
  return apiClient.get<GoalDateSuggestion>(`/user/profile/goal/suggestion?${params}`);
}

/** Without `goal_date` the API uses the pace's suggested date. "maintain" takes no pace/target/date. */
export async function saveWeightGoal(
  data:
    | { goal: "maintain" }
    | ({ goal: "lose" | "gain"; target_weight: number; goal_date?: string | null } & GoalPaceInput),
): Promise<WeightGoal> {
  const res = await apiClient.put<{ goal: WeightGoal }>("/user/profile/goal", data);
  return res.goal;
}

export async function clearWeightGoal(): Promise<void> {
  await apiClient.delete<null>("/user/profile/goal");
}
