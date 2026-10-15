import { apiClient } from "@/lib/api-client";

export interface UserProfile {
  id: string;
  phone_country_code: string | null;
  phone_number: string | null;
  email: string | null;
}

export type WeightUnits = "kg" | "lbs";
export type HeightUnits = "cm" | "ft";

export interface UserPreferences {
  timezone: string;
  weight_units: WeightUnits;
  height_units: HeightUnits;
  height: number;
}

export async function fetchProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>("/user/profile");
}

/** `null` until the user has saved preferences once — the first save must send every field. */
export async function fetchPreferences(): Promise<UserPreferences | null> {
  const res = await apiClient.get<{ preferences: UserPreferences | null }>("/user/profile/preferences");
  return res.preferences;
}

export async function updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await apiClient.put<{ preferences: UserPreferences }>("/user/profile/preferences", data);
  return res.preferences;
}
