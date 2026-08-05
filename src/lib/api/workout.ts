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
  exercise_order: number;
  target_sets: number;
  min_reps: number;
  max_reps: number;
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
}

export interface WorkoutSetAlarm {
  id: string;
  user_id: string;
  workout_set_id: string;
  exercise_id: string;
  message: string;
  discarded_at: string | null;
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
  alarmMessage?: string | null;
}

export async function logWorkoutSet(
  payload: LogSetPayload,
): Promise<{ set: WorkoutSet; alarm: WorkoutSetAlarm | null }> {
  return apiClient.post("/user/workout/sets", {
    workout_session_id: payload.workoutSessionId,
    workout_program_exercise_id: payload.workoutProgramExerciseId,
    weight: payload.weight,
    tool_weight: payload.toolWeight,
    reps: payload.reps,
    rir: payload.rir,
    effort: payload.effort,
    discomfort_notes: payload.discomfortNotes,
    alarm_message: payload.alarmMessage,
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
}

export interface ExerciseHistorySession {
  workout_session_id: string;
  started_at: string;
  plan_name: string;
  day_name: string;
  session_name: string;
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
}

export interface WorkoutSessionDetailExercise {
  workout_program_exercise_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_order: number;
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
