"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/auth/authStore";
import { postLoginPath } from "@/auth/postLoginPath";
import { ApiError } from "@/lib/api-client";
import { acceptPrivacyPolicy } from "@/lib/api/profile";
import { PRIVACY_POLICY_UPDATED, PRIVACY_POLICY_VERSION } from "@/lib/privacy-policy";

const SUMMARY = [
  "You must be 16 or older. The app's numbers and notes are general information, not medical advice.",
  "Your account, workouts and body-weight data are stored only to run the app for you.",
  "No ads, no tracking scripts, and your data is never sold.",
  "Sign-in codes are sent through an email or WhatsApp provider.",
  "AI check-ins are off unless you turn them on, and never include your name or contact details.",
  "You can download your data or delete your account at any time in Settings.",
];

/**
 * Shown after sign-in (new accounts, and existing ones whenever the terms or
 * the policy change) before anything else in the app.
 */
export default function AcceptPrivacyPage() {
  const router = useRouter();
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (_hasHydrated && status === "unauthenticated") router.replace("/login");
  }, [_hasHydrated, status, router]);

  if (!_hasHydrated || status !== "authenticated") return null;

  async function handleAccept() {
    if (!agreed || saving) return;
    setSaving(true);
    try {
      const user = await acceptPrivacyPolicy(PRIVACY_POLICY_VERSION);
      const next = {
        id: user.id,
        onboarded_at: user.onboarded_at,
        privacy_policy_accepted: user.privacy_policy_accepted,
      };
      setUser(next);
      router.replace(postLoginPath(next));
    } catch (err) {
      // 409: the app is older than the policy on the server — reload for the new text.
      if (err instanceof ApiError && err.status === 409) {
        window.location.reload();
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "Couldn't save that. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-4 pt-10 pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-none font-bold">Terms &amp; privacy</h1>
        <p className="text-[15px] text-muted-foreground">
          Please read the terms of use and the privacy policy before you start. Updated {PRIVACY_POLICY_UPDATED}.
        </p>
      </div>

      <ul className="mt-6 flex flex-col">
        {SUMMARY.map((line) => (
          <li key={line} className="border-b border-line py-3 text-[15px] leading-snug">
            {line}
          </li>
        ))}
      </ul>

      <Link href="/terms" className="mt-4 flex min-h-11 items-center text-[15px] font-semibold text-primary">
        Read the terms of use
      </Link>
      <Link href="/privacy" className="flex min-h-11 items-center text-[15px] font-semibold text-primary">
        Read the full privacy policy
      </Link>

      <div className="mt-auto flex flex-col gap-4 pt-6">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>I have read and accept the terms of use and the privacy policy.</span>
        </label>
        <Button size="xl" variant="light" className="w-full" disabled={!agreed || saving} onClick={handleAccept}>
          {saving && <Loader2 className="animate-spin" />}
          Accept and continue
        </Button>
      </div>
    </div>
  );
}
