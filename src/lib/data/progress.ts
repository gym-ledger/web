import type { PR, VolumeDataPoint, StrengthDataPoint, AppNotification } from "@/types";

export const recentPRs: PR[] = [
  {
    exerciseId: "bench-press",
    exerciseName: "Bench Press",
    weight: 92.5,
    reps: 5,
    date: "2026-05-10",
  },
  {
    exerciseId: "squat",
    exerciseName: "Squat",
    weight: 120,
    reps: 6,
    date: "2026-05-12",
  },
  {
    exerciseId: "deadlift",
    exerciseName: "Deadlift",
    weight: 165,
    reps: 3,
    date: "2026-05-15",
  },
  {
    exerciseId: "overhead-press",
    exerciseName: "Overhead Press",
    weight: 65,
    reps: 5,
    date: "2026-05-08",
  },
  {
    exerciseId: "pull-up",
    exerciseName: "Pull-Up",
    weight: 25,
    reps: 6,
    date: "2026-05-18",
  },
];

export const weeklyVolumeData: VolumeDataPoint[] = [
  { week: "W1", volume: 18200 },
  { week: "W2", volume: 20400 },
  { week: "W3", volume: 19600 },
  { week: "W4", volume: 22800 },
  { week: "W5", volume: 21400 },
  { week: "W6", volume: 24100 },
  { week: "W7", volume: 23600 },
  { week: "W8", volume: 24800 },
];

export const benchPressProgress: StrengthDataPoint[] = [
  { date: "W1", weight: 75 },
  { date: "W2", weight: 77.5 },
  { date: "W3", weight: 77.5 },
  { date: "W4", weight: 80 },
  { date: "W5", weight: 82.5 },
  { date: "W6", weight: 82.5 },
  { date: "W7", weight: 85 },
  { date: "W8", weight: 87.5 },
  { date: "W9", weight: 87.5 },
  { date: "W10", weight: 90 },
  { date: "W11", weight: 90 },
  { date: "W12", weight: 92.5 },
];

export const squatProgress: StrengthDataPoint[] = [
  { date: "W1", weight: 95 },
  { date: "W2", weight: 100 },
  { date: "W3", weight: 100 },
  { date: "W4", weight: 102.5 },
  { date: "W5", weight: 105 },
  { date: "W6", weight: 107.5 },
  { date: "W7", weight: 110 },
  { date: "W8", weight: 110 },
  { date: "W9", weight: 112.5 },
  { date: "W10", weight: 115 },
  { date: "W11", weight: 117.5 },
  { date: "W12", weight: 120 },
];

export const benchExerciseHistory = [
  { date: "May 21", sets: "4×7@90 / 4×6@90 / 4×7@87.5 / 4×8@85", maxWeight: 90 },
  { date: "May 17", sets: "4×8@87.5 / 4×7@87.5 / 4×8@85 / 4×9@82.5", maxWeight: 87.5 },
  { date: "May 13", sets: "4×8@85 / 4×7@85 / 4×8@82.5 / 4×9@80", maxWeight: 85 },
  { date: "May 9", sets: "4×8@82.5 / 4×8@82.5 / 4×9@80 / 4×10@77.5", maxWeight: 82.5 },
  { date: "May 5", sets: "4×9@80 / 4×8@80 / 4×9@77.5 / 4×10@75", maxWeight: 80 },
  { date: "May 1", sets: "4×10@77.5 / 4×9@77.5 / 4×10@75 / 4×11@72.5", maxWeight: 77.5 },
];

export const overviewStats = {
  totalVolume: 1_248_600,
  totalWorkouts: 187,
  avgDuration: 68,
  consistencyWeeks: 15,
  consistencyTotal: 16,
};

export const notifications: AppNotification[] = [
  {
    id: "notif-1",
    type: "pr",
    title: "New PR! Bench Press 92.5kg",
    body: "You hit a new personal record on the Bench Press — 92.5kg for 5 reps. Keep pushing!",
    timestamp: "1h ago",
    read: false,
    emoji: "🏆",
  },
  {
    id: "notif-2",
    type: "streak",
    title: "12-day streak! Keep it up",
    body: "You're on fire! 12 consecutive training days. Stay consistent and you'll beat your record of 28 days.",
    timestamp: "3h ago",
    read: false,
    emoji: "🔥",
  },
  {
    id: "notif-3",
    type: "reminder",
    title: "Push Day starts in 1 hour",
    body: "Your scheduled Push Day workout is coming up. Time to warm up and get ready.",
    timestamp: "5h ago",
    read: true,
    emoji: "💪",
  },
  {
    id: "notif-4",
    type: "progress",
    title: "Weekly volume up 8% — great progress",
    body: "This week you moved 24,800kg total — 8% more than last week. Your progressive overload is working.",
    timestamp: "1d ago",
    read: true,
    emoji: "📈",
  },
  {
    id: "notif-5",
    type: "milestone",
    title: "Week 8 complete. Great work.",
    body: "You've completed Week 8 of your PPL program. 4 more weeks to go in this mesocycle.",
    timestamp: "2d ago",
    read: true,
    emoji: "🎯",
  },
];
