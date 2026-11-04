"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { formatPolicyDate } from "@/lib/api/legal";
import { acceptPrivacyPolicy, fetchProfile, type UserProfile } from "@/lib/api/profile";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";

/**
 * A non-material terms/privacy update (the API marks the user as accepted but
 * a newer version exists): say what changed, link the policy, and record
 * "Got it" as acceptance of the new version. Material updates never reach
 * this: the app sends the user to /accept-privacy instead.
 */
export function PolicyUpdateNotice() {
  const profileQuery = useCachedQuery<UserProfile>("profile", fetchProfile);
  const profile = profileQuery.data;
  const [saving, setSaving] = useState(false);

  const update = profile?.privacy_policy_accepted ? profile.privacy_policy_update : null;
  if (!profile || !update) return null;

  async function handleGotIt() {
    if (!profile || !update) return;
    setSaving(true);
    try {
      profileQuery.mutate(await acceptPrivacyPolicy(update.version, "notice"));
    } catch (err) {
      // 409: an even newer version came out; refresh to show it.
      if (err instanceof ApiError && err.status === 409) void profileQuery.refresh();
      else toast.error(err instanceof ApiError ? err.message : "Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="policy-update-title"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1">
        <span id="policy-update-title" className="label-caps">
          Privacy policy updated · {formatPolicyDate(update.effective_date)}
        </span>
        <ul className="flex flex-col gap-1.5 text-[14px] leading-snug">
          {update.changes.map((c) => (
            <li key={c.version}>{c.summary}</li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/privacy" className="block">
          <Button variant="outline" size="lg" className="h-11 w-full rounded-xl">
            Read it
          </Button>
        </Link>
        <Button variant="outline" size="lg" className="h-11 w-full rounded-xl" disabled={saving} onClick={handleGotIt}>
          {saving && <Loader2 className="animate-spin" />}
          Got it
        </Button>
      </div>
    </section>
  );
}
