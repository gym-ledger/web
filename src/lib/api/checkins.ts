import { apiClient } from "@/lib/api-client";

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

/** The numbers the API computed for the week — see workout-gym-api/algorithms/weekly-checkin.md §3. */
export interface WeeklyCheckinStats {
  week_start: string;
  week_end: string;
  weight_units: string;
  training: {
    sessions_completed: number;
    days_trained: number;
    planned_sessions: number;
    planned_days_trained: number;
    avg_session_minutes: number | null;
    working_sets: number;
    sets_with_discomfort: number;
    volume: number;
    volume_last_week: number;
    volume_usual: number;
    volume_change_vs_usual_pct: number | null;
  };
  exercises: {
    prs: { name: string; load: number; reps: number; e1rm: number; previous_best_e1rm: number }[];
    stalled: { name: string; best_e1rm: number; sessions_last_3_weeks: number }[];
  };
  muscles: {
    most_trained: { name: string; sets: number }[];
    below_usual: { name: string; sets: number; usual_sets: number }[];
  };
  weight: {
    weigh_ins: number;
    weigh_in_days: number;
    avg: number | null;
    avg_last_week: number | null;
    change_vs_last_week: number | null;
    trend_per_week: number | null;
    trend_pct_per_week: number | null;
  };
  goal: {
    type: "lose" | "maintain" | "gain" | null;
    preset: string | null;
    target_weight: number | null;
    goal_date: string | null;
    weeks_left: number | null;
    target_pct_per_week: number | null;
    preset_daily_kcal: string | null;
    pace_status: WeightPaceStatus;
  };
}

/** The AI-written part. */
export interface WeeklyCheckinContent {
  headline: string;
  summary: string;
  wins: string[];
  focus: { title: string; detail: string }[];
}

/** Why the week got no AI call — see workout-gym-api/algorithms/weekly-checkin.md §2. */
export type CheckinSkipReason =
  | { kind: "weight"; logged_days: number; needed_days: number; long_inactive: boolean }
  | { kind: "workouts"; done: number; planned: number; needed: number; long_inactive: boolean }
  | { kind: "no_plan" };

export interface WeeklyCheckin {
  id: string;
  week_start: string;
  week_end: string;
  /** "skipped": the week didn't meet the data requirements, so no AI call was made. */
  status: "pending" | "ready" | "failed" | "skipped";
  stats: WeeklyCheckinStats;
  /** null until the coach note has been written (pending, or the model call failed). */
  content: WeeklyCheckinContent | null;
  skip_reasons: CheckinSkipReason[] | null;
  generated_at: string | null;
  dismissed: boolean;
}

export interface WeeklyCheckinResponse {
  /** "disabled": the user hasn't turned AI check-ins on (checkin is null). */
  status: WeeklyCheckin["status"] | "disabled";
  checkin: WeeklyCheckin | null;
}

/** Last completed Monday–Sunday week. The first call of the week writes it, so it can take a couple of seconds. */
export async function fetchWeeklyCheckin(): Promise<WeeklyCheckinResponse> {
  return apiClient.get<WeeklyCheckinResponse>("/user/checkins/weekly");
}

export async function dismissWeeklyCheckin(checkinId: string): Promise<void> {
  await apiClient.post<null>(`/user/checkins/weekly/${checkinId}/dismiss`);
}
