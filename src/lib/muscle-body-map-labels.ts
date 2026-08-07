import { FRONT_MUSCLES, type MuscleId } from "body-muscles";

/**
 * `body-muscles`' own hover/aria-label names for these two front-torso
 * regions are swapped relative to how we intentionally route data onto them
 * in muscle-body-map-adapter.ts (its "upper ab" rule sends "Upper Abs" data
 * onto the library's "obliques" SVG shape and vice versa, because that's
 * where each one visually sits in this library's artwork — see
 * PLAN_muscle_visualization.md). The library exposes no prop to override its
 * display names, but it re-reads `muscle.name` off these same shared
 * `FRONT_MUSCLES` objects on every render (SVG <title>, aria-label, and the
 * `onMuscleClick` name arg all come from here), so mutating them once here —
 * imported for its side effect before any BodyChart renders — keeps the
 * label correct through every hover/update without fighting the library's
 * internal refresh calls.
 */
const LABEL_SWAPS: Partial<Record<MuscleId, string>> = {
  "obliques-left": "Left Abs (Upper)",
  "obliques-right": "Right Abs (Upper)",
  "abs-upper-left": "Left External Oblique",
  "abs-upper-right": "Right External Oblique",
};

for (const muscle of FRONT_MUSCLES) {
  const override = LABEL_SWAPS[muscle.id];
  if (override) muscle.name = override;
}
