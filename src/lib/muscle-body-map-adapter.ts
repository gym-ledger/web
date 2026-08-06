import type { BodyState, MuscleId } from "body-muscles";
import type { MuscleSignal } from "@/lib/api/muscleSignals";

/**
 * Our `muscles` table is admin-managed free text with no left/right concept
 * (sets aren't logged per-side) and no guarantee its slugs match
 * `body-muscles`' own vocabulary. Rather than a brittle exact-slug
 * dictionary, match by keyword against `slug + " " + name` — see
 * PLAN_muscle_visualization.md §4 for the reasoning and the "unverified
 * real muscle data" risk this is hedging against.
 *
 * Ordered — first match wins. The final "back" rule is a generic catch-all
 * kept last so specific rules (lat, trap, lower back...) take priority.
 */
const MUSCLE_KEYWORD_RULES: { keywords: string[]; libraryIds: MuscleId[] }[] = [
  { keywords: ["bicep"], libraryIds: ["biceps-left", "biceps-right"] },
  {
    keywords: ["tricep"],
    libraryIds: ["triceps-lateral-left", "triceps-lateral-right", "triceps-long-left", "triceps-long-right"],
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
  {
    keywords: ["trap"],
    libraryIds: ["traps-upper-left", "traps-upper-right", "traps-mid-left", "traps-mid-right", "traps-lower-left", "traps-lower-right"],
  },
  {
    keywords: ["lat"],
    libraryIds: ["lats-upper-left", "lats-upper-right", "lats-mid-left", "lats-mid-right", "lats-lower-left", "lats-lower-right"],
  },
  {
    keywords: ["lower back", "lower-back", "erector", "spinal erector"],
    libraryIds: ["lower-back-erectors-left", "lower-back-erectors-right", "lower-back-ql-left", "lower-back-ql-right"],
  },
  { keywords: ["oblique"], libraryIds: ["obliques-left", "obliques-right"] },
  {
    keywords: ["chest", "pec"],
    libraryIds: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  },
  {
    keywords: ["ab", "core", "rectus abdomin"],
    libraryIds: ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right"],
  },
  { keywords: ["quad"], libraryIds: ["quads-left", "quads-right"] },
  {
    keywords: ["hamstring"],
    libraryIds: ["hamstrings-lateral-left", "hamstrings-lateral-right", "hamstrings-medial-left", "hamstrings-medial-right"],
  },
  {
    keywords: ["glute"],
    libraryIds: ["gluteus-maximus-left", "gluteus-maximus-right", "gluteus-medius-left", "gluteus-medius-right"],
  },
  {
    keywords: ["calf", "calve", "gastroc", "soleus"],
    libraryIds: [
      "calves-gastroc-lateral-left",
      "calves-gastroc-lateral-right",
      "calves-gastroc-medial-left",
      "calves-gastroc-medial-right",
      "calves-soleus-left",
      "calves-soleus-right",
    ],
  },
  { keywords: ["adductor", "inner thigh"], libraryIds: ["adductors-left", "adductors-right"] },
  { keywords: ["hip flexor", "hip-flexor"], libraryIds: ["hip-flexor-left", "hip-flexor-right"] },
  { keywords: ["tibialis", "shin"], libraryIds: ["tibialis-anterior-left", "tibialis-anterior-right"] },
  { keywords: ["serratus"], libraryIds: ["serratus-anterior-left", "serratus-anterior-right"] },
  { keywords: ["neck"], libraryIds: ["neck-left", "neck-right", "nape"] },
  { keywords: ["spine"], libraryIds: ["spine"] },
  {
    keywords: ["back"],
    libraryIds: ["lats-upper-left", "lats-upper-right", "lats-mid-left", "lats-mid-right", "lats-lower-left", "lats-lower-right", "traps-mid-left", "traps-mid-right"],
  },
];

export function resolveLibraryIds(slug: string, name: string): MuscleId[] {
  const haystack = `${slug} ${name}`.toLowerCase();
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
 * library ids, the higher percent wins for the shared id.
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
