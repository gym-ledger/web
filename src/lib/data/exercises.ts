import type { Exercise } from "@/types";

export const exercises: Exercise[] = [
  {
    id: "bench-press",
    name: "Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    equipment: "barbell",
    difficulty: "intermediate",
    category: "compound",
    description:
      "The bench press is a compound upper-body push exercise that primarily targets the pectorals, anterior deltoids, and triceps.",
    tips: [
      "Retract and depress your scapulae before unracking",
      "Keep feet flat on the floor",
      "Drive the bar in a slight arc — not straight up",
      "Maintain a natural arch in your lower back",
    ],
  },
  {
    id: "squat",
    name: "Barbell Squat",
    primaryMuscle: "legs",
    secondaryMuscles: ["glutes", "core", "back"],
    equipment: "barbell",
    difficulty: "intermediate",
    category: "compound",
    description:
      "The barbell squat is the king of lower-body exercises, building quad, hamstring, and glute strength while stimulating full-body muscle growth.",
    tips: [
      "Brace your core hard before descending",
      "Track knees over toes",
      "Hit parallel or below for full muscle recruitment",
      "Keep your chest tall throughout",
    ],
  },
  {
    id: "deadlift",
    name: "Deadlift",
    primaryMuscle: "back",
    secondaryMuscles: ["legs", "glutes", "traps", "forearms"],
    equipment: "barbell",
    difficulty: "advanced",
    category: "compound",
    description:
      "The deadlift is an essential compound pull movement training the entire posterior chain from neck to heel.",
    tips: [
      "Bar stays over mid-foot at setup",
      "Lat engagement prevents the bar swinging away",
      "Push the floor away — don't think 'pull'",
      "Lock hips and knees simultaneously at the top",
    ],
  },
  {
    id: "overhead-press",
    name: "Overhead Press",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps", "traps", "core"],
    equipment: "barbell",
    difficulty: "intermediate",
    category: "compound",
    description:
      "The overhead press builds full shoulder development and pressing strength, also challenging core stability.",
    tips: [
      "Start with bar at clavicle level",
      "Press slightly back — bar travels behind the head plane",
      "Squeeze glutes for lumbar stability",
      "Full lockout at the top",
    ],
  },
  {
    id: "pull-up",
    name: "Pull-Up",
    primaryMuscle: "lats",
    secondaryMuscles: ["biceps", "back", "core"],
    equipment: "bodyweight",
    difficulty: "intermediate",
    category: "compound",
    description:
      "Pull-ups are one of the best exercises for building a wide, thick back and strong biceps using only bodyweight.",
    tips: [
      "Dead hang to start for full ROM",
      "Initiate with lat depression, not arm pull",
      "Chin clears the bar at the top",
      "Control the negative (3+ seconds)",
    ],
  },
  {
    id: "barbell-row",
    name: "Barbell Row",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "lats", "traps"],
    equipment: "barbell",
    difficulty: "intermediate",
    category: "compound",
    description:
      "The barbell row is a horizontal pull movement building overall back thickness and scapular retraction strength.",
    tips: [
      "Hinge to ~45° torso angle",
      "Pull the bar into your lower sternum",
      "Keep the bar close throughout",
      "Squeeze shoulder blades at the top",
    ],
  },
  {
    id: "incline-db-press",
    name: "Incline Dumbbell Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders", "triceps"],
    equipment: "dumbbell",
    difficulty: "beginner",
    category: "compound",
    description:
      "Incline dumbbell press emphasizes the upper chest and allows greater range of motion than the barbell variation.",
    tips: [
      "Set bench to 30–45 degrees",
      "Touch dumbbells at top for full contraction",
      "Lower slowly to feel a good stretch",
      "Keep wrists neutral",
    ],
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    primaryMuscle: "legs",
    secondaryMuscles: ["glutes", "back", "forearms"],
    equipment: "barbell",
    difficulty: "intermediate",
    category: "compound",
    description:
      "The RDL develops hamstring and glute strength through a hip-hinge pattern, building the posterior chain.",
    tips: [
      "Slight knee bend maintained throughout",
      "Bar stays in contact with legs",
      "Feel the hamstring stretch at the bottom",
      "Hip drive powers the ascent",
    ],
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    primaryMuscle: "lats",
    secondaryMuscles: ["biceps", "back"],
    equipment: "cable",
    difficulty: "beginner",
    category: "compound",
    description:
      "The lat pulldown mimics the pull-up pattern and is great for building width and vertical pulling strength.",
    tips: [
      "Lean slightly back (~20°)",
      "Pull elbows down to hips",
      "Avoid using momentum",
      "Full stretch at the top",
    ],
  },
  {
    id: "cable-fly",
    name: "Cable Fly",
    primaryMuscle: "chest",
    secondaryMuscles: [],
    equipment: "cable",
    difficulty: "beginner",
    category: "isolation",
    description:
      "Cable flys isolate the pectoral muscles with constant tension throughout the range of motion.",
    tips: [
      "Slight elbow bend maintained",
      "Think hugging a large tree",
      "Squeeze at the center",
      "Control the return under tension",
    ],
  },
  {
    id: "dumbbell-curl",
    name: "Dumbbell Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    difficulty: "beginner",
    category: "isolation",
    description:
      "The dumbbell curl builds bicep peak and allows each arm to work independently.",
    tips: [
      "Supinate wrist as you curl",
      "Don't swing — isolate the bicep",
      "Full extension at the bottom",
      "Squeeze hard at the top",
    ],
  },
  {
    id: "tricep-pushdown",
    name: "Tricep Pushdown",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "cable",
    difficulty: "beginner",
    category: "isolation",
    description:
      "The cable tricep pushdown isolates the triceps with constant tension through the full range.",
    tips: [
      "Elbows pinned to sides",
      "Full extension — lock out the elbow",
      "Control the return",
      "Use a rope for extra pronation",
    ],
  },
  {
    id: "leg-press",
    name: "Leg Press",
    primaryMuscle: "legs",
    secondaryMuscles: ["glutes"],
    equipment: "machine",
    difficulty: "beginner",
    category: "compound",
    description:
      "The leg press allows heavy quad and glute loading with reduced spinal loading compared to the squat.",
    tips: [
      "Don't lock knees at the top",
      "Feet placement changes muscle emphasis",
      "Never let lower back round off seat",
      "Full ROM for best results",
    ],
  },
  {
    id: "seated-db-shoulder-press",
    name: "Seated DB Shoulder Press",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps", "traps"],
    equipment: "dumbbell",
    difficulty: "beginner",
    category: "compound",
    description:
      "The seated dumbbell shoulder press builds shoulder mass and pressing strength with greater ROM than barbell.",
    tips: [
      "Dumbbells at ear level to start",
      "Press straight up without flaring",
      "Touch dumbbells at top (optional)",
      "Sit upright — no excessive lean",
    ],
  },
  {
    id: "lateral-raise",
    name: "Lateral Raise",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["traps"],
    equipment: "dumbbell",
    difficulty: "beginner",
    category: "isolation",
    description:
      "Lateral raises isolate the lateral deltoid, the muscle responsible for shoulder width.",
    tips: [
      "Slight forward lean (10–20°)",
      "Lead with elbows, not wrists",
      "Don't go above shoulder height",
      "Slow negative for best pump",
    ],
  },
  {
    id: "face-pull",
    name: "Face Pull",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["traps", "back"],
    equipment: "cable",
    difficulty: "beginner",
    category: "isolation",
    description:
      "Face pulls train the often neglected rear delts and external rotators, improving shoulder health and posture.",
    tips: [
      "Set cable at face height",
      "Pull to forehead — not chin",
      "Externally rotate at the top",
      "Light weight, high reps",
    ],
  },
  {
    id: "plank",
    name: "Plank",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders", "glutes"],
    equipment: "bodyweight",
    difficulty: "beginner",
    category: "compound",
    description:
      "The plank is a fundamental isometric core exercise building anti-extension stability.",
    tips: [
      "Neutral spine — no sagging hips",
      "Squeeze glutes and abs simultaneously",
      "Breathe steadily",
      "Progress to weighted plank or RKC plank",
    ],
  },
  {
    id: "leg-curl",
    name: "Leg Curl",
    primaryMuscle: "legs",
    secondaryMuscles: [],
    equipment: "machine",
    difficulty: "beginner",
    category: "isolation",
    description:
      "The leg curl isolates the hamstrings through knee flexion with constant machine resistance.",
    tips: [
      "Full ROM — don't cut the stretch",
      "Control the negative",
      "Point toes for bicep femoris emphasis",
      "Avoid hip flexion compensation",
    ],
  },
  {
    id: "calf-raise",
    name: "Standing Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "machine",
    difficulty: "beginner",
    category: "isolation",
    description:
      "Standing calf raises build the gastrocnemius muscle for powerful, well-developed calves.",
    tips: [
      "Full ROM — deep stretch at bottom",
      "Pause at the top",
      "Slow negative for best growth",
      "Don't bounce",
    ],
  },
  {
    id: "cable-row",
    name: "Seated Cable Row",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "lats"],
    equipment: "cable",
    difficulty: "beginner",
    category: "compound",
    description:
      "The seated cable row builds horizontal pulling strength and back thickness with constant cable tension.",
    tips: [
      "Row to lower sternum",
      "Squeeze shoulder blades at the top",
      "Don't lean back excessively",
      "Full stretch at the return",
    ],
  },
];

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

export function getExercisesByMuscle(muscle: string): Exercise[] {
  return exercises.filter(
    (e) => e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle as never)
  );
}

export const muscleGroups = [
  "All",
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
];
