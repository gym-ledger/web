import { apiClient } from "@/lib/api-client";
import { writeCachedApiResponse } from "@/lib/offline/apiResponseCache";
import { setCachedQueryData } from "@/lib/offline/useCachedQuery";

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
  /** The public plan this is the user's copy of — what "Browse Plans" lists. */
  source_workout_program_id: string | null;
  /** The plan is the user's own copy, so its exercises can be changed. */
  is_editable: boolean;
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

export async function reactivateWorkoutPlan(assignmentId: string): Promise<WorkoutPlanAssignment> {
  return apiClient.post<WorkoutPlanAssignment>(`/user/workout/plans/${assignmentId}/activate`);
}

/** Replaces the user's copy of a plan with the newest version of the plan it came from, dropping their edits. */
export async function resetWorkoutPlanToSource(assignmentId: string): Promise<WorkoutPlanAssignment> {
  return apiClient.post<WorkoutPlanAssignment>(`/user/workout/plans/${assignmentId}/reset-to-source`);
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
  /** The user's own copy of a plan, selected in My Plans — its exercises can be edited. */
  is_editable: boolean;
  assignment_id: string | null;
  /** Set when the plan this was copied from has a newer published version. */
  update_available: {
    workout_program_version_id: string;
    version_number: number;
    version_name: string | null;
  } | null;
  program_days: PlanDetailDay[];
}

/** Full config of a plan — every day (including rest days), session, and exercise. */
export async function fetchPlanDetail(workoutProgramVersionId: string): Promise<PlanDetail> {
  return apiClient.get<PlanDetail>(`/user/workout/plans/${workoutProgramVersionId}/detail`);
}

export interface PlanExerciseTargets {
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetRir: number | null;
  restSeconds: number | null;
  notes: string | null;
}

function planExerciseTargetsBody(targets: PlanExerciseTargets) {
  return {
    target_sets: targets.targetSets,
    min_reps: targets.minReps,
    max_reps: targets.maxReps,
    target_rir: targets.targetRir,
    rest_seconds: targets.restSeconds,
    notes: targets.notes,
  };
}

/** Appends an exercise to a session of the user's own plan. */
export async function addPlanExercise(
  workoutProgramVersionId: string,
  daySessionId: string,
  exerciseId: string,
  targets: PlanExerciseTargets,
): Promise<PlanDetailExercise> {
  return apiClient.post<PlanDetailExercise>(
    `/user/workout/plans/${workoutProgramVersionId}/sessions/${daySessionId}/exercises`,
    { exercise_id: exerciseId, ...planExerciseTargetsBody(targets) },
  );
}

export async function updatePlanExercise(
  workoutProgramVersionId: string,
  planExerciseId: string,
  targets: PlanExerciseTargets,
): Promise<PlanDetailExercise> {
  return apiClient.put<PlanDetailExercise>(
    `/user/workout/plans/${workoutProgramVersionId}/exercises/${planExerciseId}`,
    planExerciseTargetsBody(targets),
  );
}

export async function removePlanExercise(workoutProgramVersionId: string, planExerciseId: string): Promise<void> {
  await apiClient.delete(`/user/workout/plans/${workoutProgramVersionId}/exercises/${planExerciseId}`);
}

/** Saves a new order for a plan session's exercises — `planExerciseIds` must list all of them. */
export async function reorderPlanExercises(
  workoutProgramVersionId: string,
  daySessionId: string,
  planExerciseIds: string[],
): Promise<void> {
  await apiClient.put(
    `/user/workout/plans/${workoutProgramVersionId}/sessions/${daySessionId}/exercise-order`,
    { exercise_ids: planExerciseIds },
  );
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
  /** Set on an exercise added to the plan mid-workout: its sets/reps come from what's logged in that workout. */
  targets_from_workout_session_id: string | null;
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

/**
 * Adds an exercise to a live session. `"session"`: just this workout (e.g. a
 * machine was unavailable). `"plan"`: also every future run of the plan
 * session `programDaySessionId` — its planned sets/reps are taken from what
 * gets logged in this workout once it's finished.
 */
export async function addSessionExercise(
  sessionId: string,
  exerciseId: string,
  scope: { kind: "session" } | { kind: "plan"; programDaySessionId: string },
): Promise<PlanExercise> {
  return apiClient.post<PlanExercise>(`/user/workout/sessions/${sessionId}/adhoc-exercise`, {
    exercise_id: exerciseId,
    scope: scope.kind,
    program_day_session_id: scope.kind === "plan" ? scope.programDaySessionId : undefined,
  });
}

/** Adds an exercise to this workout only. Kept for the frozen `/old` UI. */
export async function addAdhocExercise(sessionId: string, exerciseId: string): Promise<PlanExercise> {
  return addSessionExercise(sessionId, exerciseId, { kind: "session" });
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

/**
 * Starts (or resumes) the session for this plan day. Pass a client-generated
 * `id` and `startedAt` to create it for a local draft — retries with the same
 * `id` return it. Always use the returned `id`: when another session is
 * already in progress for the plan, that one comes back instead.
 */
export async function startWorkoutSession(params: {
  assignmentId: string;
  programDayId: string;
  programDaySessionId: string;
  id?: string;
  startedAt?: string;
}): Promise<WorkoutSession> {
  return apiClient.post<WorkoutSession>("/user/workout/sessions/start", {
    assignment_id: params.assignmentId,
    program_day_id: params.programDayId,
    program_day_session_id: params.programDaySessionId,
    id: params.id,
    started_at: params.startedAt,
  });
}

export async function fetchSessionSets(sessionId: string): Promise<WorkoutSet[]> {
  return apiClient.get<WorkoutSet[]>(`/user/workout/sessions/${sessionId}/sets`);
}

const ONGOING_SESSION_PATH = "/user/workout/sessions/ongoing";
/** useCachedQuery key of Home's "workout in progress" banner. */
export const ONGOING_WORKOUT_QUERY_KEY = "home/ongoing-workout";

export async function finishWorkoutSession(sessionId: string): Promise<WorkoutSession> {
  const finished = await apiClient.post<WorkoutSession>(`/user/workout/sessions/${sessionId}/finish`);
  // The offline copy of "workout in progress" would otherwise still point at
  // this workout, and reopening the app offline would resume a finished one.
  await writeCachedApiResponse(ONGOING_SESSION_PATH, null);
  // Same for Home's saved banner (see OngoingWorkoutBanner).
  await setCachedQueryData(ONGOING_WORKOUT_QUERY_KEY, null);
  return finished;
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
  return apiClient.get<OngoingWorkoutSession | null>(ONGOING_SESSION_PATH);
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
  /** 0 = felt nothing, 1–5. Null on drop sets, warmups and unrated sets. */
  contraction?: number | null;
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
  /** 0 = felt nothing, 1–5 = how well the muscle contracted. Main, non-warmup sets only. */
  contraction?: number | null;
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
    contraction: payload.contraction,
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
  /** 0 = felt nothing, 1–5 = how well the muscle contracted. Main, non-warmup sets only. */
  contraction?: number | null;
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
    contraction: payload.contraction,
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
  /** 0 = felt nothing, 1–5 = how well the muscle contracted. Main, non-warmup sets only. */
  contraction?: number | null;
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
      contraction: item.contraction,
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
  contraction?: number | null;
  alarm_message: string | null;
  /** Optional: responses from API versions before this field was added omit it. */
  is_warmup?: boolean;
  parent_set_id: string | null;
  drop_order: number | null;
  created_at: string;
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
  contraction?: number | null;
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
  /** Estimated one-rep max (Epley: load × (1 + reps / 30)). */
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
  /** Full completed weeks since the earliest active plan's start where every required day was trained. */
  consistent_weeks: number;
  /** Full completed weeks since the earliest active plan's start (denominator for consistent_weeks). */
  total_tracked_weeks: number;
}

export async function fetchProgressOverview(): Promise<ProgressOverview> {
  return apiClient.get<ProgressOverview>("/user/workout/stats/progress-overview");
}
