import { apiClient } from "@/lib/api-client";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  email: string | null;
  /** False for users who have only ever signed in with a one-time code — they can set a password without the current one. */
  has_password: boolean;
  created_at: string;
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

/** `lastName` null or "" clears it. */
export async function updateName(data: { firstName: string; lastName: string | null }): Promise<UserProfile> {
  return apiClient.put<UserProfile>("/user/profile/name", data);
}

/** `currentPassword` is required only when the user already has a password. */
export async function changePassword(data: { currentPassword?: string; newPassword: string }): Promise<void> {
  await apiClient.put<null>("/user/profile/password", data);
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
