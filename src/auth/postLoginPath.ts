import type { AuthUser } from "./authTypes";

/**
 * Where a signed-in user lands: the privacy policy until they accept the
 * current version, then onboarding until they finish or skip it. Only an
 * explicit `false` / `null` counts — a user object without the field (an
 * older API) goes straight home.
 */
export function postLoginPath(user: AuthUser | null): string {
  if (user?.privacy_policy_accepted === false) return "/accept-privacy";
  return user?.onboarded_at === null ? "/onboarding" : "/home";
}
