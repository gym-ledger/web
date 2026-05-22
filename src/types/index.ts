// User types
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  memberSince: string;
  goal: "build_muscle" | "get_stronger" | "lose_fat" | "general_fitness";
  experience: "beginner" | "intermediate" | "advanced";
  trainingDays: number;
  equipment: "full_gym" | "home_dumbbells" | "bodyweight";
  units: "kg" | "lbs";
  stats: UserStats;
}

export interface UserStats {
  totalWorkouts: number;
  totalPRs: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number;
  weeklyVolume: number;
  monthlyWorkouts: number;
}

// Exercise types
export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: ExerciseCategory;
  description: string;
  tips: string[];
}

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "core"
  | "calves"
  | "forearms"
  | "traps"
  | "lats";

export type EquipmentType =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "ez-bar";

export type ExerciseCategory =
  | "compound"
  | "isolation"
  | "cardio"
  | "plyometric";

// Workout types
export interface WorkoutProgram {
  id: string;
  name: string;
  shortName: string;
  description: string;
  daysPerWeek: number;
  currentWeek: number;
  totalWeeks: number;
  currentPhase: string;
  days: WorkoutDay[];
}

export interface WorkoutDay {
  id: string;
  name: string;
  dayNumber: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  targetReps: string;
  targetRIR: number;
  restSeconds: number;
  notes?: string;
}

// Active workout types
export interface ActiveSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number;
  completed: boolean;
  previousWeight?: number;
  previousReps?: number;
}

export interface ActiveExercise {
  id: string;
  exercise: Exercise;
  sets: ActiveSet[];
  notes?: string;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  programName: string;
  startTime: Date;
  exercises: ActiveExercise[];
}

// History types
export interface WorkoutSession {
  id: string;
  date: string;
  programName: string;
  dayName: string;
  duration: number;
  totalVolume: number;
  exercises: SessionExercise[];
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  sets: SessionSet[];
}

export interface SessionSet {
  weight: number;
  reps: number;
  rir: number;
}

// Progress types
export interface PR {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
}

export interface VolumeDataPoint {
  week: string;
  volume: number;
}

export interface StrengthDataPoint {
  date: string;
  weight: number;
}

export interface ExerciseHistory {
  exerciseId: string;
  sessions: {
    date: string;
    sets: SessionSet[];
    maxWeight: number;
  }[];
}

// Notification types
export interface AppNotification {
  id: string;
  type: "pr" | "streak" | "reminder" | "progress" | "milestone";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  emoji: string;
}

// Onboarding types
export interface OnboardingData {
  goal?: "build_muscle" | "get_stronger" | "lose_fat" | "general_fitness";
  experience?: "beginner" | "intermediate" | "advanced";
  trainingDays?: number;
  equipment?: "full_gym" | "home_dumbbells" | "bodyweight";
}
