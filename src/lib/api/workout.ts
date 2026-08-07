import { apiClient } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export interface PublicWorkoutPlan {
  workout_program_id: string;
  name: string;
  slug: string;
  workout_program_version_id: string;
  version_number: number;
  version_name: string | null;
  description: string;
  training_days: number;
  split_type: string;
  session_ordering_logic: string;
  duration_type: string;
  duration_weeks: number;
}

export interface WorkoutPlanAssignment {
  id: string;
  user_id: string;
  workout_program_id: string;
  workout_program_version_id: string;
  started_at: string | null;
  current_program_day_id: string | null;
  current_program_day_session_id: string | null;
  is_active: boolean;
  program_name: string;
  version_name: string | null;
  version_number: number;
  training_days: number;
  split_type: string;
  created_at: string;
  updated_at: string;
}

export async function fetchPublicWorkoutPlans(): Promise<PublicWorkoutPlan[]> {
  return apiClient.get<PublicWorkoutPlan[]>("/user/workout/plans/public");
}

export async function fetchMyWorkoutPlans(): Promise<WorkoutPlanAssignment[]> {
  return apiClient.get<WorkoutPlanAssignment[]>("/user/workout/plans/mine");
}

export async function fetchActiveWorkoutPlans(): Promise<WorkoutPlanAssignment[]> {
  return apiClient.get<WorkoutPlanAssignment[]>("/user/workout/assignments/active");
}

export async function selectWorkoutPlan(workoutProgramId: string): Promise<WorkoutPlanAssignment> {
  return apiClient.post<WorkoutPlanAssignment>("/user/workout/plans/select", {
    workout_program_id: workoutProgramId,
  });
}

export async function deselectWorkoutPlan(assignmentId: string): Promise<WorkoutPlanAssignment> {
  return apiClient.delete<WorkoutPlanAssignment>(`/user/workout/plans/${assignmentId}`);
}

export interface PlanDetailExercise {
  id: string;
  workout_program_day_session_id: string;
  exercise_order: number;
  target_sets: number | null;
  min_reps: number | null;
  max_reps: number | null;
  target_rir: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
    description: string | null;
  } | null;
}

export interface PlanDetailSession {
  id: string;
  workout_program_day_id: string;
  name: string;
  exercises: PlanDetailExercise[];
}

export interface PlanDetailDay {
  id: string;
  day_number: number;
  name: string;
  sessions: PlanDetailSession[];
}

export interface PlanDetail {
  workout_program_id: string;
  program_name: string;
  program_slug: string;
  program_visibility: string;
  workout_program_version_id: string;
  version_number: number;
  version_name: string | null;
  version_visibility: string;
  description: string;
  training_days: number;
  split_type: string;
  session_ordering_logic: string;
  duration_type: string;
  duration_weeks: number;
  program_days: PlanDetailDay[];
}

/** Full read-only config of a plan — every day (including rest days), session, and exercise. */
export async function fetchPlanDetail(workoutProgramVersionId: string): Promise<PlanDetail> {
  return apiClient.get<PlanDetail>(`/user/workout/plans/${workoutProgramVersionId}/detail`);
}

// ---------------------------------------------------------------------------
// Day / session / exercise browsing
// ---------------------------------------------------------------------------

export interface ProgramDay {
  id: string;
  name: string;
  day_number: number;
}

export interface ProgramDaySession {
  id: string;
  name: string;
  workout_program_day_id: string;
}

export interface PlanExercise {
  id: string;
  /** Null for an exercise added ad-hoc mid-session — it has no plan-defined ordering/targets. */
  exercise_order: number | null;
  target_sets: number | null;
  min_reps: number | null;
  max_reps: number | null;
  target_rir: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
    description: string | null;
  } | null;
}

export async function fetchProgramDays(assignmentId: string): Promise<ProgramDay[]> {
  return apiClient.get<ProgramDay[]>(`/user/workout/assignments/${assignmentId}/days`);
}

export async function fetchProgramDaySessions(
  assignmentId: string,
  dayId: string,
): Promise<ProgramDaySession[]> {
  return apiClient.get<ProgramDaySession[]>(
    `/user/workout/assignments/${assignmentId}/days/${dayId}/sessions`,
  );
}

export async function fetchSessionExercises(
  assignmentId: string,
  dayId: string,
  sessionId: string,
): Promise<PlanExercise[]> {
  return apiClient.get<PlanExercise[]>(
    `/user/workout/assignments/${assignmentId}/days/${dayId}/sessions/${sessionId}/exercises`,
  );
}

/** Adds an exercise to a live session that isn't part of the programmed plan (e.g. a machine was unavailable). */
export async function addAdhocExercise(
  sessionId: string,
  exerciseId: string,
): Promise<PlanExercise> {
  return apiClient.post<PlanExercise>(`/user/workout/sessions/${sessionId}/adhoc-exercise`, {
    exercise_id: exerciseId,
  });
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

export interface WorkoutSession {
  id: string;
  user_id: string;
  program_assignment_id: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
}

export async function startWorkoutSession(params: {
  assignmentId: string;
  programDayId: string;
  programDaySessionId: string;
}): Promise<WorkoutSession> {
  return apiClient.post<WorkoutSession>("/user/workout/sessions/start", {
    assignment_id: params.assignmentId,
    program_day_id: params.programDayId,
    program_day_session_id: params.programDaySessionId,
  });
}

export async function fetchSessionSets(sessionId: string): Promise<WorkoutSet[]> {
  return apiClient.get<WorkoutSet[]>(`/user/workout/sessions/${sessionId}/sets`);
}

export async function finishWorkoutSession(sessionId: string): Promise<WorkoutSession> {
  return apiClient.post<WorkoutSession>(`/user/workout/sessions/${sessionId}/finish`);
}

export interface OngoingWorkoutSession {
  session_id: string;
  started_at: string;
  assignment_id: string;
  program_day_id: string | null;
  program_day_session_id: string | null;
  program_name: string;
  day_name: string | null;
  session_name: string | null;
}

export async function fetchOngoingWorkoutSession(): Promise<OngoingWorkoutSession | null> {
  return apiClient.get<OngoingWorkoutSession | null>("/user/workout/sessions/ongoing");
}

// ---------------------------------------------------------------------------
// Set logging
// ---------------------------------------------------------------------------

export interface WorkoutSet {
  id: string;
  workout_session_id: string;
  workout_program_exercise_id: string;
  set_order: number;
  weight: number | null;
  tool_weight: number | null;
  reps: number | null;
  rir: number | null;
  is_warmup: boolean;
  effort: string | null;
  discomfort_notes: string | null;
  created_at: string;
  parent_set_id: string | null;
  drop_order: number | null;
}

export interface WorkoutSetAlarm {
  id: string;
  user_id: string;
  workout_set_id: string;
  exercise_id: string;
  message: string;
  discarded_at: string | null;
}

export interface DropSetFields {
  weight?: number | null;
  toolWeight?: number | null;
  reps?: number | null;
  rir?: number | null;
  effort?: string | null;
  discomfortNotes?: string | null;
}

export interface LogSetPayload {
  workoutSessionId: string;
  workoutProgramExerciseId: string;
  weight?: number | null;
  toolWeight?: number | null;
  reps?: number | null;
  rir?: number | null;
  effort?: string | null;
  discomfortNotes?: string | null;
  isWarmup?: boolean;
  alarmMessage?: string | null;
  dropSets?: DropSetFields[];
}

export async function logWorkoutSet(
  payload: LogSetPayload,
): Promise<{ set: WorkoutSet; dropSets: WorkoutSet[]; alarm: WorkoutSetAlarm | null }> {
  return apiClient.post("/user/workout/sets", {
    workout_session_id: payload.workoutSessionId,
    workout_program_exercise_id: payload.workoutProgramExerciseId,
    weight: payload.weight,
    tool_weight: payload.toolWeight,
    reps: payload.reps,
    rir: payload.rir,
    effort: payload.effort,
    discomfort_notes: payload.discomfortNotes,
    is_warmup: payload.isWarmup,
    alarm_message: payload.alarmMessage,
    drop_sets: payload.dropSets?.map((d) => ({
      weight: d.weight,
      tool_weight: d.toolWeight,
      reps: d.reps,
      rir: d.rir,
      effort: d.effort,
      discomfort_notes: d.discomfortNotes,
    })),
  });
}

export interface UpdateSetPayload {
  weight?: number | null;
  toolWeight?: number | null;
  reps?: number | null;
  rir?: number | null;
  effort?: string | null;
  discomfortNotes?: string | null;
  isWarmup?: boolean;
}

export async function updateWorkoutSet(
  setId: string,
  payload: UpdateSetPayload,
): Promise<WorkoutSet> {
  return apiClient.put(`/user/workout/sets/${setId}`, {
    weight: payload.weight,
    tool_weight: payload.toolWeight,
    reps: payload.reps,
    rir: payload.rir,
    effort: payload.effort,
    discomfort_notes: payload.discomfortNotes,
    is_warmup: payload.isWarmup,
  });
}

export interface BatchSetItem {
  clientId: string;
  workoutSessionId: string;
  workoutProgramExerciseId: string;
  weight?: number | null;
  toolWeight?: number | null;
  reps?: number | null;
  rir?: number | null;
  effort?: string | null;
  discomfortNotes?: string | null;
  isWarmup?: boolean;
  alarmMessage?: string | null;
  dropSets?: DropSetFields[];
}

export type BatchSetResult =
  | { client_id: string; set: WorkoutSet; dropSets: WorkoutSet[]; alarm: WorkoutSetAlarm | null }
  | { client_id: string; error: string };

export async function logWorkoutSetsBatch(
  items: BatchSetItem[],
): Promise<{ results: BatchSetResult[] }> {
  return apiClient.post("/user/workout/sets/batch", {
    sets: items.map((item) => ({
      client_id: item.clientId,
      workout_session_id: item.workoutSessionId,
      workout_program_exercise_id: item.workoutProgramExerciseId,
      weight: item.weight,
      tool_weight: item.toolWeight,
      reps: item.reps,
      rir: item.rir,
      effort: item.effort,
      discomfort_notes: item.discomfortNotes,
      is_warmup: item.isWarmup,
      alarm_message: item.alarmMessage,
      drop_sets: item.dropSets?.map((d) => ({
        weight: d.weight,
        tool_weight: d.toolWeight,
        reps: d.reps,
        rir: d.rir,
        effort: d.effort,
        discomfort_notes: d.discomfortNotes,
      })),
    })),
  });
}

// ---------------------------------------------------------------------------
// Exercise history
// ---------------------------------------------------------------------------

export interface ExerciseHistorySet {
  id: string;
  set_order: number;
  weight: number | null;
  tool_weight: number | null;
  reps: number | null;
  rir: number | null;
  effort: string | null;
  discomfort_notes: string | null;
  alarm_message: string | null;
  parent_set_id: string | null;
  drop_order: number | null;
}

export interface ExerciseHistorySession {
  workout_session_id: string;
  started_at: string;
  plan_name: string;
  /** Null when this occurrence was logged ad-hoc, not as part of an admin-authored day/session. */
  day_name: string | null;
  session_name: string | null;
  sets: ExerciseHistorySet[];
}

export async function fetchExerciseHistory(
  exerciseId: string,
  limit = 5,
  beforeSessionId?: string,
): Promise<ExerciseHistorySession[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (beforeSessionId) query.set("beforeSessionId", beforeSessionId);
  return apiClient.get<ExerciseHistorySession[]>(
    `/user/workout/exercises/${exerciseId}/history?${query.toString()}`,
  );
}

// ---------------------------------------------------------------------------
// Past workout sessions
// ---------------------------------------------------------------------------

export interface WorkoutSessionListItem {
  id: string;
  program_assignment_id: string;
  started_at: string;
  completed_at: string | null;
  plan_name: string;
  day_name: string | null;
  session_name: string | null;
  total_sets: number;
  total_exercises: number;
}

export interface WorkoutSessionsPage {
  data: WorkoutSessionListItem[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export async function fetchWorkoutSessions(params: {
  page?: number;
  limit?: number;
} = {}): Promise<WorkoutSessionsPage> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiClient.get<WorkoutSessionsPage>(`/user/workout/sessions${qs ? `?${qs}` : ""}`);
}

export interface WorkoutSessionDetailSet {
  id: string;
  set_order: number;
  weight: number | null;
  tool_weight: number | null;
  reps: number | null;
  rir: number | null;
  effort: string | null;
  discomfort_notes: string | null;
  created_at: string;
  parent_set_id: string | null;
  drop_order: number | null;
}

export interface WorkoutSessionDetailExercise {
  workout_program_exercise_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_order: number | null;
  is_adhoc: boolean;
  sets: WorkoutSessionDetailSet[];
}

export interface WorkoutSessionDetail {
  id: string;
  started_at: string;
  completed_at: string | null;
  plan_name: string;
  day_name: string | null;
  session_name: string | null;
  exercises: WorkoutSessionDetailExercise[];
}

export async function fetchWorkoutSessionDetail(sessionId: string): Promise<WorkoutSessionDetail> {
  return apiClient.get<WorkoutSessionDetail>(`/user/workout/sessions/${sessionId}/detail`);
}

// ---------------------------------------------------------------------------
// Dashboard alarms
// ---------------------------------------------------------------------------

export interface ActiveAlarm {
  id: string;
  workout_set_id: string;
  exercise_id: string;
  exercise_name: string;
  message: string;
  created_at: string;
}

export async function fetchActiveAlarms(): Promise<ActiveAlarm[]> {
  return apiClient.get<ActiveAlarm[]>("/user/workout/alarms/active");
}

export async function discardAlarm(alarmId: string): Promise<WorkoutSetAlarm> {
  return apiClient.post<WorkoutSetAlarm>(`/user/workout/alarms/${alarmId}/discard`);
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export interface DashboardStats {
  current_streak: number;
  /** Monday-Sunday of the current calendar week, in the user's timezone. */
  week: { date: string; trained: boolean; required: boolean }[];
  weekly_volume: number;
  weight_units: "kg" | "lbs";
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiClient.get<DashboardStats>("/user/workout/stats/dashboard");
}

export interface PersonalRecord {
  exercise_id: string;
  exercise_name: string;
  exercise_slug: string;
  image_url: string | null;
  /** When this record was set. */
  achieved_at: string;
  /** weight + tool_weight for the record-setting set. */
  load: number;
  reps: number;
  /** Estimated one-rep max (Epley) — see workout-gym-api/algorithms/personal-records.md. */
  e1rm: number;
}

/** Current PR per exercise, most-recently-set first. */
export async function fetchRecentPRs(limit?: number): Promise<PersonalRecord[]> {
  const qs = limit ? `?limit=${limit}` : "";
  return apiClient.get<PersonalRecord[]>(`/user/workout/stats/recent-prs${qs}`);
}

export interface ProgressOverview {
  total_volume: number;
  total_workouts: number;
  avg_duration_seconds: number | null;
  weight_units: "kg" | "lbs";
  /** Last 8 calendar weeks, oldest first. */
  weekly_volume_series: { week_start: string; volume: number }[];
  week_over_week_change_pct: number | null;
  best_week_volume: number;
  avg_week_volume: number;
  /** Last 4 weeks vs. the 4 weeks from ~9-12 weeks back. */
  growth_rate_pct: number | null;
}

export async function fetchProgressOverview(): Promise<ProgressOverview> {
  return apiClient.get<ProgressOverview>("/user/workout/stats/progress-overview");
}
