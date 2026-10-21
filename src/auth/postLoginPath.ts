import type { AuthUser } from "./authTypes";

/**
 * Where a signed-in user lands: first, if the account is scheduled for
 * deletion, the choice to keep it or sign out again; then the terms and
 * privacy policy until they accept the current version; then onboarding
 * until they finish or skip it. Only an explicit value counts — a user object
 * without the field (an older API) goes straight home.
 */
export function postLoginPath(user: AuthUser | null): string {
  if (typeof user?.deletion_scheduled_for === "string") return "/account-deletion";
  if (user?.privacy_policy_accepted === false) return "/accept-privacy";
  return user?.onboarded_at === null ? "/onboarding" : "/home";
}
