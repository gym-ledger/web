import type { User } from "@/types";

export const currentUser: User = {
  id: "user-1",
  name: "Alex Chen",
  username: "alexchen",
  email: "alex.chen@example.com",
  memberSince: "2024-01-15",
  goal: "get_stronger",
  experience: "intermediate",
  trainingDays: 6,
  equipment: "full_gym",
  units: "kg",
  stats: {
    totalWorkouts: 187,
    totalPRs: 34,
    currentStreak: 12,
    longestStreak: 28,
    totalVolume: 1_248_600,
    weeklyVolume: 24_800,
    monthlyWorkouts: 22,
  },
};

export const achievements = [
  {
    id: "first-workout",
    name: "First Step",
    description: "Completed your first workout",
    unlocked: true,
    unlockedDate: "2024-01-15",
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "Maintained a 7-day training streak",
    unlocked: true,
    unlockedDate: "2024-02-01",
  },
  {
    id: "100-workouts",
    name: "Century Club",
    description: "Completed 100 workouts",
    unlocked: true,
    unlockedDate: "2024-08-20",
  },
  {
    id: "pr-master",
    name: "PR Machine",
    description: "Set 25 personal records",
    unlocked: false,
    unlockedDate: null,
  },
];

export const favoriteExercises = [
  "bench-press",
  "squat",
  "deadlift",
  "overhead-press",
  "pull-up",
];

// Weekly consistency: true = trained, false = rest
export const weeklyConsistency = [
  { day: "Mon", trained: true },
  { day: "Tue", trained: true },
  { day: "Wed", trained: false },
  { day: "Thu", trained: true },
  { day: "Fri", trained: true },
  { day: "Sat", trained: true },
  { day: "Sun", trained: false },
];
