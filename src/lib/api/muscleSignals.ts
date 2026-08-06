import { apiClient } from "@/lib/api-client";

export interface MuscleSignal {
  muscle_id: string;
  name: string;
  slug: string;
  parent_muscle_id: string | null;
  body_region: string | null;
  display_order: number;
  /** null when this muscle isn't tracked for training signal (`muscles.xp_enabled = false`). */
  training_percent: number | null;
  /** null when this muscle isn't tracked for fatigue signal (`muscles.recovery_enabled = false`). */
  fatigue_percent: number | null;
}

export async function fetchMuscleSignals(): Promise<MuscleSignal[]> {
  return apiClient.get<MuscleSignal[]>("/user/muscle-signals");
}
