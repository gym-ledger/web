import { apiClient } from "@/lib/api-client";
import type { AuthUser } from "@/auth/authTypes";

/** How the user identifies themselves — the body shape every auth endpoint expects. */
export type Identity =
  | { method: "email"; email: string }
  | { method: "phone"; phoneNumber: { code: string; number: string } };

/** The refresh token isn't here: the API sets it as an httpOnly cookie. */
export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string | number;
  user: AuthUser;
}

/** Instance settings that change which sign-in options the UI offers. */
export interface AuthConfig {
  /** Whether codes can be sent to phone numbers (over WhatsApp). */
  phoneOtpEnabled: boolean;
}

// Mirrors PASSWORD_MIN_LENGTH / PASSWORD_MAX_LENGTH on the API.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const PUBLIC = { auth: false };

export function getAuthConfig() {
  return apiClient.get<AuthConfig>("/auth/config");
}

export function sendLoginOtp(identity: Identity) {
  return apiClient.post<null>("/auth/login/send-otp", identity, PUBLIC);
}

export function verifyLoginOtp(identity: Identity, otp: string) {
  return apiClient.post<LoginResponse>("/auth/login/verify-otp", { ...identity, otp }, PUBLIC);
}

export function loginWithPassword(identity: Identity, password: string) {
  return apiClient.post<LoginResponse>("/auth/login/password", { ...identity, password }, PUBLIC);
}

/** Resolves the same way whether or not an account exists for `identity`. */
export function sendPasswordResetOtp(identity: Identity) {
  return apiClient.post<null>("/auth/forgot-password/send-otp", identity, PUBLIC);
}

export function verifyPasswordResetOtp(identity: Identity, otp: string) {
  return apiClient.post<{ resetToken: string; resetTokenExpiresAt: string }>(
    "/auth/forgot-password/verify-otp",
    { ...identity, otp },
    PUBLIC,
  );
}

/** Also signs the user out of every session. */
export function resetPassword(resetToken: string, newPassword: string) {
  return apiClient.post<null>("/auth/forgot-password/reset-password", { resetToken, newPassword }, PUBLIC);
}
