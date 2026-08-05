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

// Note: real workout-plan/session/set types now live in `lib/api/workout.ts`
// (mirroring how `lib/api/weight.ts` owns the weight-tracking types), since
// that data comes from a real backend rather than being app-wide mock state.

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

// Notification types
export interface AppNotification {
  id: string;
  type: "pr" | "streak" | "reminder" | "progress" | "milestone";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

// Onboarding types
export interface OnboardingData {
  goal?: "build_muscle" | "get_stronger" | "lose_fat" | "general_fitness";
  experience?: "beginner" | "intermediate" | "advanced";
  trainingDays?: number;
  equipment?: "full_gym" | "home_dumbbells" | "bodyweight";
}
