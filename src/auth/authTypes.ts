export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string | number;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone_number?: string;
  phone_country_code?: string;
  [key: string]: unknown;
}

export type AuthBroadcastEvent =
  | { type: "TOKEN_REFRESHED"; accessToken: string; accessTokenExpiresAt: number }
  | { type: "REFRESH_TOKEN_ROTATED"; refreshToken: string }
  | { type: "LOGGED_OUT" };
