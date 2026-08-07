import type { BodyState, MuscleId } from "body-muscles";
import type { MuscleSignal } from "@/lib/api/muscleSignals";

/**
 * Our `muscles` table is admin-managed free text with no left/right concept
 * (sets aren't logged per-side) and no guarantee its slugs match
 * `body-muscles`' own vocabulary. Rather than a brittle exact-slug
 * dictionary, match by keyword against `slug + " " + name` — see
 * PLAN_muscle_visualization.md §4/§9 for the full reasoning.
 *
 * Ordered — first match wins. Two collision classes were found and fixed by
 * checking real production muscle data (see §9 in the plan doc):
 *
 * 1. **Specific-before-generic within a group.** A generic parent rule (e.g.
 *    one "ab"/"core" rule mapping to all four `abs-*` ids) collides with a
 *    more specific child muscle ("Upper Abs") when both exist — whichever
 *    has the higher signal silently wins the *other* muscle's region too.
 *    Every group with real sub-parts (abs, calves, chest, delts, traps,
 *    glutes, forearms, lower-back, triceps) lists specific rules first, with
 *    the parent/generic rule last as a fallback for when a taxonomy doesn't
 *    split that group.
 * 2. **Bare keyword false positives across groups.** Short generic keywords
 *    collide with *anatomical* names that happen to contain them as a
 *    substring, not just "this same group but less specific": real examples
 *    that broke — "**Biceps Femoris**" (a hamstring head) was caught by the
 *    "bicep" rule meant for the arm muscle; "**Vastus Lateralis**" (a quad
 *    head) was caught by the "lat" rule meant for lats, since "lateralis"
 *    contains "lat"; "**Neck Extensors**" was caught by the bare "extensor"
 *    keyword meant only for forearm extensors. Fix: anatomically-specific
 *    multi-word names (vastus/rectus femoris, biceps femoris, semitendinosus,
 *    etc.) get their own rules ordered before any single short keyword that
 *    could otherwise swallow them, and bare single-word keywords that proved
 *    collision-prone ("extensor", "flexor") were scoped to require their
 *    group's qualifying word ("forearm extensor").
 *
 * The final "back" rule is an unrelated generic catch-all kept last overall
 * so all specific rules above it take priority.
 */
const MUSCLE_KEYWORD_RULES: { keywords: string[]; libraryIds: MuscleId[] }[] = [
  // Hamstrings — checked before "bicep" so "Biceps Femoris" (a hamstring
  // head) doesn't get caught by the arm-biceps rule below.
  { keywords: ["biceps femoris"], libraryIds: ["hamstrings-lateral-left", "hamstrings-lateral-right"] },
  {
    keywords: ["semitendinosus", "semimembranosus"],
    libraryIds: ["hamstrings-medial-left", "hamstrings-medial-right"],
  },
  {
    keywords: ["hamstring"],
    libraryIds: ["hamstrings-lateral-left", "hamstrings-lateral-right", "hamstrings-medial-left", "hamstrings-medial-right"],
  },

  // Quads — checked before "lat" so "Vastus Lateralis" doesn't get caught
  // by the lats rule below (it contains "lat" as a substring of "lateralis").
  {
    keywords: ["rectus femoris", "vastus lateralis", "vastus medialis", "vastus intermedius"],
    libraryIds: ["quads-left", "quads-right"],
  },
  { keywords: ["quad"], libraryIds: ["quads-left", "quads-right"] },

  // Biceps (arm) — "brachialis" is a distinct elbow flexor with no library
  // id of its own; closest visual proxy is the biceps region.
  { keywords: ["brachialis"], libraryIds: ["biceps-left", "biceps-right"] },
  { keywords: ["bicep"], libraryIds: ["biceps-left", "biceps-right"] },

  // Triceps — head-specific before the generic bucket.
  {
    keywords: ["long head tricep", "triceps long head"],
    libraryIds: ["triceps-long-left", "triceps-long-right"],
  },
  {
    keywords: ["lateral head tricep", "triceps lateral head"],
    libraryIds: ["triceps-lateral-left", "triceps-lateral-right"],
  },
  {
    // No library id for the medial head specifically — falls back to both.
    keywords: ["medial head tricep", "triceps medial head"],
    libraryIds: ["triceps-lateral-left", "triceps-lateral-right", "triceps-long-left", "triceps-long-right"],
  },
  {
    keywords: ["tricep"],
    libraryIds: ["triceps-lateral-left", "triceps-lateral-right", "triceps-long-left", "triceps-long-right"],
  },

  // Forearms — flexors/extensors/brachioradialis before the generic bucket.
  // "extensor"/"flexor" alone are deliberately NOT used as keywords here —
  // "Neck Extensors" collided with a bare "extensor" keyword in production.
  { keywords: ["brachioradialis"], libraryIds: ["forearm-left", "forearm-right"] },
  {
    keywords: ["forearm flexor"],
    libraryIds: ["forearm-flexors-left", "forearm-flexors-right"],
  },
  {
    keywords: ["forearm extensor"],
    libraryIds: ["forearm-extensors-left", "forearm-extensors-right"],
  },
  {
    keywords: ["forearm"],
    libraryIds: [
      "forearm-left",
      "forearm-right",
      "forearm-extensors-left",
      "forearm-extensors-right",
      "forearm-flexors-left",
      "forearm-flexors-right",
    ],
  },

  // Shoulders/delts — front/side/rear before the generic bucket. Very
  // commonly split by name in real programs ("Front Delts" / "Rear Delts"),
  // so this is a high-collision-risk group.
  {
    keywords: ["front delt", "anterior delt"],
    libraryIds: ["shoulder-front-left", "shoulder-front-right"],
  },
  {
    keywords: ["side delt", "lateral delt", "medial delt"],
    libraryIds: ["shoulder-side-left", "shoulder-side-right"],
  },
  {
    keywords: ["rear delt", "posterior delt"],
    libraryIds: ["deltoid-rear-left", "deltoid-rear-right"],
  },
  {
    keywords: ["shoulder", "delt"],
    libraryIds: [
      "shoulder-front-left",
      "shoulder-front-right",
      "shoulder-side-left",
      "shoulder-side-right",
      "deltoid-rear-left",
      "deltoid-rear-right",
    ],
  },

  // Traps — upper/mid/lower before the generic bucket. "Rhomboids" and
  // "Teres Major" have no dedicated library id; closest visual proxies are
  // mid-traps and lats respectively.
  { keywords: ["rhomboid"], libraryIds: ["traps-mid-left", "traps-mid-right"] },
  {
    keywords: ["upper trap"],
    libraryIds: ["traps-upper-left", "traps-upper-right"],
  },
  {
    keywords: ["mid trap", "middle trap"],
    libraryIds: ["traps-mid-left", "traps-mid-right"],
  },
  {
    keywords: ["lower trap"],
    libraryIds: ["traps-lower-left", "traps-lower-right"],
  },
  {
    keywords: ["trap"],
    libraryIds: ["traps-upper-left", "traps-upper-right", "traps-mid-left", "traps-mid-right", "traps-lower-left", "traps-lower-right"],
  },

  { keywords: ["teres major"], libraryIds: ["lats-upper-left", "lats-upper-right"] },
  {
    keywords: ["upper back"],
    libraryIds: ["lats-upper-left", "lats-upper-right", "traps-upper-left", "traps-upper-right"],
  },
  {
    keywords: ["lat"],
    libraryIds: ["lats-upper-left", "lats-upper-right", "lats-mid-left", "lats-mid-right", "lats-lower-left", "lats-lower-right"],
  },

  // Lower back — erectors/QL before the generic bucket.
  {
    keywords: ["quadratus lumborum", " ql "],
    libraryIds: ["lower-back-ql-left", "lower-back-ql-right"],
  },
  {
    keywords: ["erector", "spinal erector"],
    libraryIds: ["lower-back-erectors-left", "lower-back-erectors-right"],
  },
  {
    keywords: ["lower back", "lower-back"],
    libraryIds: ["lower-back-erectors-left", "lower-back-erectors-right", "lower-back-ql-left", "lower-back-ql-right"],
  },

  { keywords: ["upper ab"], libraryIds: ["obliques-left", "obliques-right"] },

  // Chest — upper/lower before the generic bucket. "Mid Chest" has no
  // dedicated region — falls back to the full chest bucket.
  {
    keywords: ["upper chest", "upper pec", "clavicular"],
    libraryIds: ["chest-upper-left", "chest-upper-right"],
  },
  {
    keywords: ["lower chest", "lower pec", "sternal"],
    libraryIds: ["chest-lower-left", "chest-lower-right"],
  },
  {
    keywords: ["chest", "pec"],
    libraryIds: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  },

  // Abs — upper/lower before the generic bucket. "Transverse Abdominis" is
  // a deep stabilizer with no dedicated region — falls back to the full
  // abs bucket, same as generic "Core".
  {
    keywords: ["lower ab"],
    libraryIds: ["abs-lower-left", "abs-lower-right"],
  },
  {
    keywords: ["upper ab"],
    libraryIds: ["abs-upper-left", "abs-upper-right"],
  },
  {
    keywords: ["ab", "core", "rectus abdomin", "transverse abdomin"],
    libraryIds: ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right"],
  },

  // Glutes — max/med/min before the generic bucket. "Glute Minimus" has no
  // dedicated region — closest visual proxy is glute medius (minimus sits
  // deep to it, same area).
  {
    keywords: ["glute max", "gluteus maximus"],
    libraryIds: ["gluteus-maximus-left", "gluteus-maximus-right"],
  },
  {
    keywords: ["glute med", "gluteus medius", "glute min", "gluteus minimus"],
    libraryIds: ["gluteus-medius-left", "gluteus-medius-right"],
  },
  {
    keywords: ["glute"],
    libraryIds: ["gluteus-maximus-left", "gluteus-maximus-right", "gluteus-medius-left", "gluteus-medius-right"],
  },

  // Calves — gastrocnemius/soleus before the generic bucket.
  {
    keywords: ["gastrocnemius", "gastroc"],
    libraryIds: ["calves-gastroc-lateral-left", "calves-gastroc-lateral-right", "calves-gastroc-medial-left", "calves-gastroc-medial-right"],
  },
  {
    keywords: ["soleus"],
    libraryIds: ["calves-soleus-left", "calves-soleus-right"],
  },
  {
    keywords: ["calf", "calve"],
    libraryIds: [
      "calves-gastroc-lateral-left",
      "calves-gastroc-lateral-right",
      "calves-gastroc-medial-left",
      "calves-gastroc-medial-right",
      "calves-soleus-left",
      "calves-soleus-right",
    ],
  },

  { keywords: ["adductors", "inner thigh"], libraryIds: ["adductors-left", "adductors-right"] },
  { keywords: ["hip flexors", "hip-flexors"], libraryIds: ["hip-flexor-left", "hip-flexor-right"] },
  { keywords: ["tibialis", "shin"], libraryIds: ["tibialis-anterior-left", "tibialis-anterior-right"] },
  { keywords: ["serratus"], libraryIds: ["serratus-anterior-left", "serratus-anterior-right"] },

  // Neck — front (SCM) vs back (extensors) before the generic bucket. The
  // library actually has separate front/back neck regions, so this is
  // precise, not a fallback.
  { keywords: ["sternocleidomastoid"], libraryIds: ["neck-left", "neck-right"] },
  { keywords: ["neck extensor"], libraryIds: ["nape"] },
  { keywords: ["neck"], libraryIds: ["neck-left", "neck-right", "nape"] },

  { keywords: ["spine"], libraryIds: ["spine"] },
  {
    keywords: ["back"],
    libraryIds: ["lats-upper-left", "lats-upper-right", "lats-mid-left", "lats-mid-right", "lats-lower-left", "lats-lower-right", "traps-mid-left", "traps-mid-right"],
  },
];

export function resolveLibraryIds(slug: string, name: string): MuscleId[] {
  const haystack = ` ${slug} ${name} `.toLowerCase();
  for (const rule of MUSCLE_KEYWORD_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return rule.libraryIds;
    }
  }
  return [];
}

/** 0–100% signal -> body-muscles' native 0–10 intensity scale. */
export function percentToIntensity(percent: number | null): number {
  if (percent == null) return 0;
  return Math.max(0, Math.min(10, Math.round(percent / 10)));
}

export type SignalMode = "training" | "fatigue";

/**
 * Builds the BodyState for every library muscle id touched by `signals`,
 * for the active mode. When multiple admin muscles map to overlapping
 * library ids (e.g. a generic "Calves" and a specific "Gastrocnemius" both
 * existing), the higher percent wins for the shared id.
 */
export function buildBodyState(signals: MuscleSignal[], mode: SignalMode): BodyState {
  const state: BodyState = {};
  for (const signal of signals) {
    const percent = mode === "training" ? signal.training_percent : signal.fatigue_percent;
    if (percent == null) continue;
    const intensity = percentToIntensity(percent);
    for (const id of resolveLibraryIds(signal.slug, signal.name)) {
      const existing = state[id];
      if (!existing || existing.intensity < intensity) {
        state[id] = { intensity, selected: false };
      }
    }
  }
  return state;
}

/** Exact percent (not the lossy 0–10 bucket) for the muscle a given library id maps to — used for the tap-to-inspect panel. */
export function findPercentForLibraryId(
  signals: MuscleSignal[],
  mode: SignalMode,
  libraryId: MuscleId,
): { name: string; percent: number } | null {
  let best: { name: string; percent: number } | null = null;
  for (const signal of signals) {
    const percent = mode === "training" ? signal.training_percent : signal.fatigue_percent;
    if (percent == null) continue;
    if (!resolveLibraryIds(signal.slug, signal.name).includes(libraryId)) continue;
    if (!best || percent > best.percent) {
      best = { name: signal.name, percent };
    }
  }
  return best;
}
