import { apiClient } from "@/lib/api-client";

export interface Muscle {
  id: string;
  name: string;
  slug: string;
  parent_muscle_id: string | null;
  body_region: string | null;
  display_order: number;
}

export async function fetchMuscles(): Promise<Muscle[]> {
  return apiClient.get<Muscle[]>("/user/exercises/muscles");
}

export interface ExerciseMuscleLink {
  id: string;
  name: string;
  slug: string;
  body_region: string | null;
  /** Fraction 0–1 of how much this exercise trains the muscle. */
  contribution: number;
}

export interface ExerciseListItem {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  muscles: ExerciseMuscleLink[];
}

export interface ExercisesPage {
  data: ExerciseListItem[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export async function fetchExercises(params: {
  search?: string;
  bodyRegion?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ExercisesPage> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.bodyRegion) query.set("bodyRegion", params.bodyRegion);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiClient.get<ExercisesPage>(`/user/exercises${qs ? `?${qs}` : ""}`);
}

export type ExerciseDetail = ExerciseListItem;

export async function fetchExerciseById(id: string): Promise<ExerciseDetail> {
  return apiClient.get<ExerciseDetail>(`/user/exercises/${id}`);
}
