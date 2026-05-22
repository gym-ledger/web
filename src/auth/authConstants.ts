export const STORAGE_KEY = "apex-auth-rt" as const;
export const BROADCAST_CHANNEL_NAME = "apex-auth" as const;
export const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000;
export const REFRESH_ENDPOINT = "/auth/login/refresh-tokens" as const;
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function normalizeExpiresAt(raw: string | number): number {
  if (typeof raw === "string") return new Date(raw).getTime();
  if (raw < 1e12) return raw * 1000;
  return raw;
}
