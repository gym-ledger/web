import { apiClient } from "@/lib/api-client";

/**
 * Terms + privacy policy versions come from the API (src/config/policyVersions.ts
 * there); this app keeps no copy. See that file before changing the policy text.
 */
export interface PolicyVersionInfo {
  version: string;
  /** YYYY-MM-DD, shown as "Last updated". */
  effective_date: string;
  summary: string;
}

export interface PolicyInfo {
  current: PolicyVersionInfo;
  /** Newest first. */
  history: PolicyVersionInfo[];
}

/** Public: works before sign-in. */
export function fetchPolicyInfo(): Promise<PolicyInfo> {
  return apiClient.get<PolicyInfo>("/legal/policy");
}

export function formatPolicyDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
