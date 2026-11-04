"use client";

import { fetchPolicyInfo, formatPolicyDate, type PolicyInfo } from "@/lib/api/legal";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";

/**
 * "Last updated <date>" for the terms and privacy pages, from the API's
 * current policy version (this app keeps no copy). Renders nothing until
 * known, so a page read offline never shows a wrong date.
 */
export function PolicyUpdatedDate() {
  const info = useCachedQuery<PolicyInfo>("legal/policy", fetchPolicyInfo).data;
  if (!info) return null;
  return (
    <p className="text-[13px] text-muted-foreground">Last updated {formatPolicyDate(info.current.effective_date)}</p>
  );
}
