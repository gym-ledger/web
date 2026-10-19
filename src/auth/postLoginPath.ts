import type { AuthUser } from "./authTypes";

/**
 * Where a signed-in user lands: onboarding until they finish or skip it.
 * Only an explicit `onboarded_at: null` counts — a user object without the
 * field (an older API) goes straight home.
 */
export function postLoginPath(user: AuthUser | null): string {
  return user?.onboarded_at === null ? "/onboarding" : "/home";
}
