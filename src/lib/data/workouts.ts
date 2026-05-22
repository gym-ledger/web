import type { WorkoutProgram, WorkoutSession } from "@/types";
import { exercises } from "./exercises";

const getBench = () => exercises.find((e) => e.id === "bench-press")!;
const getSquat = () => exercises.find((e) => e.id === "squat")!;
const getDeadlift = () => exercises.find((e) => e.id === "deadlift")!;
const getOHP = () => exercises.find((e) => e.id === "overhead-press")!;
const getPullUp = () => exercises.find((e) => e.id === "pull-up")!;
const getRow = () => exercises.find((e) => e.id === "barbell-row")!;
const getInclineDB = () => exercises.find((e) => e.id === "incline-db-press")!;
const getRDL = () => exercises.find((e) => e.id === "romanian-deadlift")!;
const getLatPulldown = () => exercises.find((e) => e.id === "lat-pulldown")!;
const getCableFly = () => exercises.find((e) => e.id === "cable-fly")!;
const getTricepPushdown = () => exercises.find((e) => e.id === "tricep-pushdown")!;
const getCurl = () => exercises.find((e) => e.id === "dumbbell-curl")!;
const getLateralRaise = () => exercises.find((e) => e.id === "lateral-raise")!;
const getFacePull = () => exercises.find((e) => e.id === "face-pull")!;
const getLegPress = () => exercises.find((e) => e.id === "leg-press")!;
const getLegCurl = () => exercises.find((e) => e.id === "leg-curl")!;

export const workoutPrograms: WorkoutProgram[] = [
  {
    id: "ppl",
    name: "Push Pull Legs",
    shortName: "PPL",
    description:
      "Classic 6-day push/pull/legs split for intermediate lifters focused on strength and hypertrophy.",
    daysPerWeek: 6,
    currentWeek: 8,
    totalWeeks: 12,
    currentPhase: "Hypertrophy Block",
    days: [
      {
        id: "ppl-push-a",
        name: "Push A",
        dayNumber: 1,
        exercises: [
          {
            id: "ppl-bench",
            exercise: getBench(),
            sets: 4,
            targetReps: "6-8",
            targetRIR: 1,
            restSeconds: 180,
          },
          {
            id: "ppl-ohp",
            exercise: getOHP(),
            sets: 3,
            targetReps: "8-10",
            targetRIR: 2,
            restSeconds: 150,
          },
          {
            id: "ppl-incline",
            exercise: getInclineDB(),
            sets: 3,
            targetReps: "10-12",
            targetRIR: 2,
            restSeconds: 120,
          },
          {
            id: "ppl-lateral",
            exercise: getLateralRaise(),
            sets: 4,
            targetReps: "15-20",
            targetRIR: 1,
            restSeconds: 60,
          },
          {
            id: "ppl-tricep",
            exercise: getTricepPushdown(),
            sets: 3,
            targetReps: "12-15",
            targetRIR: 1,
            restSeconds: 60,
          },
        ],
      },
      {
        id: "ppl-pull-a",
        name: "Pull A",
        dayNumber: 2,
        exercises: [
          {
            id: "ppl-deadlift",
            exercise: getDeadlift(),
            sets: 3,
            targetReps: "4-6",
            targetRIR: 1,
            restSeconds: 240,
          },
          {
            id: "ppl-pullup",
            exercise: getPullUp(),
            sets: 4,
            targetReps: "6-10",
            targetRIR: 2,
            restSeconds: 120,
          },
          {
            id: "ppl-row",
            exercise: getRow(),
            sets: 4,
            targetReps: "8-10",
            targetRIR: 2,
            restSeconds: 120,
          },
          {
            id: "ppl-lat-pull",
            exercise: getLatPulldown(),
            sets: 3,
            targetReps: "10-12",
            targetRIR: 2,
            restSeconds: 90,
          },
          {
            id: "ppl-curl",
            exercise: getCurl(),
            sets: 3,
            targetReps: "12-15",
            targetRIR: 1,
            restSeconds: 60,
          },
          {
            id: "ppl-face-pull",
            exercise: getFacePull(),
            sets: 3,
            targetReps: "15-20",
            targetRIR: 1,
            restSeconds: 60,
          },
        ],
      },
      {
        id: "ppl-legs-a",
        name: "Legs A",
        dayNumber: 3,
        exercises: [
          {
            id: "ppl-squat",
            exercise: getSquat(),
            sets: 4,
            targetReps: "6-8",
            targetRIR: 1,
            restSeconds: 180,
          },
          {
            id: "ppl-rdl",
            exercise: getRDL(),
            sets: 3,
            targetReps: "8-10",
            targetRIR: 2,
            restSeconds: 150,
          },
          {
            id: "ppl-leg-press",
            exercise: getLegPress(),
            sets: 3,
            targetReps: "10-15",
            targetRIR: 2,
            restSeconds: 120,
          },
          {
            id: "ppl-leg-curl",
            exercise: getLegCurl(),
            sets: 3,
            targetReps: "12-15",
            targetRIR: 1,
            restSeconds: 90,
          },
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper Lower 4-Day",
    shortName: "Upper Lower",
    description:
      "4-day upper/lower split. Great for strength gains with adequate frequency and recovery.",
    daysPerWeek: 4,
    currentWeek: 3,
    totalWeeks: 8,
    currentPhase: "Strength Focus",
    days: [
      {
        id: "ul-upper-a",
        name: "Upper A (Strength)",
        dayNumber: 1,
        exercises: [
          {
            id: "ul-bench",
            exercise: getBench(),
            sets: 4,
            targetReps: "4-6",
            targetRIR: 1,
            restSeconds: 210,
          },
          {
            id: "ul-row",
            exercise: getRow(),
            sets: 4,
            targetReps: "4-6",
            targetRIR: 1,
            restSeconds: 210,
          },
          {
            id: "ul-ohp",
            exercise: getOHP(),
            sets: 3,
            targetReps: "6-8",
            targetRIR: 2,
            restSeconds: 150,
          },
          {
            id: "ul-curl",
            exercise: getCurl(),
            sets: 3,
            targetReps: "10-12",
            targetRIR: 2,
            restSeconds: 60,
          },
          {
            id: "ul-tricep",
            exercise: getTricepPushdown(),
            sets: 3,
            targetReps: "10-12",
            targetRIR: 2,
            restSeconds: 60,
          },
        ],
      },
      {
        id: "ul-lower-a",
        name: "Lower A (Strength)",
        dayNumber: 2,
        exercises: [
          {
            id: "ul-squat",
            exercise: getSquat(),
            sets: 4,
            targetReps: "4-6",
            targetRIR: 1,
            restSeconds: 240,
          },
          {
            id: "ul-rdl",
            exercise: getRDL(),
            sets: 4,
            targetReps: "6-8",
            targetRIR: 2,
            restSeconds: 150,
          },
          {
            id: "ul-leg-press",
            exercise: getLegPress(),
            sets: 3,
            targetReps: "8-10",
            targetRIR: 2,
            restSeconds: 120,
          },
          {
            id: "ul-leg-curl",
            exercise: getLegCurl(),
            sets: 3,
            targetReps: "10-12",
            targetRIR: 2,
            restSeconds: 90,
          },
        ],
      },
    ],
  },
];

export const recentWorkouts: WorkoutSession[] = [
  {
    id: "session-1",
    date: "2026-05-21",
    programName: "PPL",
    dayName: "Push A",
    duration: 68,
    totalVolume: 8_240,
    exercises: [
      {
        exerciseId: "bench-press",
        exerciseName: "Bench Press",
        sets: [
          { weight: 90, reps: 7, rir: 1 },
          { weight: 90, reps: 6, rir: 1 },
          { weight: 87.5, reps: 7, rir: 2 },
          { weight: 85, reps: 8, rir: 2 },
        ],
      },
      {
        exerciseId: "overhead-press",
        exerciseName: "Overhead Press",
        sets: [
          { weight: 60, reps: 9, rir: 2 },
          { weight: 60, reps: 8, rir: 2 },
          { weight: 57.5, reps: 9, rir: 2 },
        ],
      },
      {
        exerciseId: "incline-db-press",
        exerciseName: "Incline Dumbbell Press",
        sets: [
          { weight: 32, reps: 12, rir: 2 },
          { weight: 32, reps: 11, rir: 2 },
          { weight: 30, reps: 12, rir: 2 },
        ],
      },
    ],
  },
  {
    id: "session-2",
    date: "2026-05-20",
    programName: "PPL",
    dayName: "Pull A",
    duration: 72,
    totalVolume: 9_160,
    exercises: [
      {
        exerciseId: "deadlift",
        exerciseName: "Deadlift",
        sets: [
          { weight: 160, reps: 5, rir: 1 },
          { weight: 155, reps: 5, rir: 2 },
          { weight: 150, reps: 6, rir: 2 },
        ],
      },
      {
        exerciseId: "pull-up",
        exerciseName: "Pull-Up",
        sets: [
          { weight: 20, reps: 8, rir: 2 },
          { weight: 20, reps: 7, rir: 2 },
          { weight: 15, reps: 8, rir: 2 },
          { weight: 10, reps: 9, rir: 2 },
        ],
      },
    ],
  },
  {
    id: "session-3",
    date: "2026-05-19",
    programName: "PPL",
    dayName: "Legs A",
    duration: 76,
    totalVolume: 14_800,
    exercises: [
      {
        exerciseId: "squat",
        exerciseName: "Barbell Squat",
        sets: [
          { weight: 120, reps: 7, rir: 1 },
          { weight: 120, reps: 6, rir: 1 },
          { weight: 115, reps: 7, rir: 2 },
          { weight: 110, reps: 8, rir: 2 },
        ],
      },
    ],
  },
  {
    id: "session-4",
    date: "2026-05-17",
    programName: "PPL",
    dayName: "Push A",
    duration: 65,
    totalVolume: 7_920,
    exercises: [
      {
        exerciseId: "bench-press",
        exerciseName: "Bench Press",
        sets: [
          { weight: 87.5, reps: 8, rir: 2 },
          { weight: 87.5, reps: 7, rir: 2 },
          { weight: 85, reps: 8, rir: 2 },
          { weight: 82.5, reps: 9, rir: 2 },
        ],
      },
    ],
  },
];

export const todayWorkout = {
  programName: "PPL",
  dayName: "Push Day",
  programId: "ppl",
  dayId: "ppl-push-a",
  exercises: ["Bench Press", "Overhead Press", "Incline DB Press", "Lateral Raise", "Tricep Pushdown"],
};
