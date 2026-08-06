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
 * Ordered — first match wins. Within each anatomical group, **specific
 * sub-part rules come before the generic/parent rule for that same group**
 * (e.g. "Upper Abs" before generic "Abs"). This matters: if a rule for a
 * generic parent muscle (e.g. "Abs") mapped to the *same* library ids as a
 * more specific child muscle (e.g. "Upper Abs"), both would collide on the
 * same region and whichever muscle currently has the higher signal value
 * would silently win every tap/highlight for that region — even in the
 * *other* muscle's rightful area. This was a confirmed real bug (verified
 * by rendering the library's actual SVG geometry, not just its id names —
 * see the id→name→bbox audit that produced this rewrite): a generic
 * "ab"/"core" rule mapped to *all four* abs ids, and a generic "calf"
 * rule mapped to *all six* calf ids, so a specific "Gastrocnemius" muscle
 * with real data would out-rank a generic "Calves" muscle for every calf
 * tap, and "Upper Abs"/"Lower Abs" could each bleed into the other's
 * region. The generic rule for each group is now a *fallback only* for
 * when the admin has a single undivided muscle (e.g. just "Abs", no
 * separate upper/lower) — it comes last within its group precisely so a
 * more specific sibling always wins when both exist.
 *
 * The final "back" rule is an unrelated generic catch-all kept last overall
 * so all specific rules above it take priority.
 */
const MUSCLE_KEYWORD_RULES: { keywords: string[]; libraryIds: MuscleId[] }[] = [
  { keywords: ["bicep"], libraryIds: ["biceps-left", "biceps-right"] },
  {
    keywords: ["tricep"],
    libraryIds: ["triceps-lateral-left", "triceps-lateral-right", "triceps-long-left", "triceps-long-right"],
  },

  // Forearms — flexors/extensors before the generic bucket.
  {
    keywords: ["forearm flexor", "flexor"],
    libraryIds: ["forearm-flexors-left", "forearm-flexors-right"],
  },
  {
    keywords: ["forearm extensor", "extensor"],
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

  // Traps — upper/mid/lower before the generic bucket.
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

  { keywords: ["oblique"], libraryIds: ["obliques-left", "obliques-right"] },

  // Chest — upper/lower before the generic bucket. Very commonly split
  // ("Upper Chest" / incline vs "Lower Chest" / decline).
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

  // Abs — upper/lower before the generic bucket. Confirmed bug source:
  // a single "ab"/"core" rule previously mapped to all four ids, so
  // "Upper Abs" and "Lower Abs" (if both exist) would collide.
  {
    keywords: ["lower ab"],
    libraryIds: ["abs-lower-left", "abs-lower-right"],
  },
  {
    keywords: ["upper ab"],
    libraryIds: ["abs-upper-left", "abs-upper-right"],
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

  // Glutes — max/med before the generic bucket. Commonly split ("Glute
  // Max" vs "Glute Med", e.g. for hip-abduction-focused work).
  {
    keywords: ["glute max", "gluteus maximus"],
    libraryIds: ["gluteus-maximus-left", "gluteus-maximus-right"],
  },
  {
    keywords: ["glute med", "gluteus medius"],
    libraryIds: ["gluteus-medius-left", "gluteus-medius-right"],
  },
  {
    keywords: ["glute"],
    libraryIds: ["gluteus-maximus-left", "gluteus-maximus-right", "gluteus-medius-left", "gluteus-medius-right"],
  },

  // Calves — gastrocnemius/soleus before the generic bucket. Confirmed bug
  // source (user-reported): a single rule mapped "calf"/"gastroc"/"soleus"
  // all to the same six ids, so a specific "Gastrocnemius" muscle with real
  // data always out-ranked a generic "Calves" muscle for every tap.
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
