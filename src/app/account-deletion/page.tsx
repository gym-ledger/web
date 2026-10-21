"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/auth/authStore";
import { postLoginPath } from "@/auth/postLoginPath";
import { performLogout } from "@/auth/tokenManager";
import { ApiError } from "@/lib/api-client";
import { cancelAccountDeletion } from "@/lib/api/account";
import { formatLongDate } from "@/lib/format-date";

/**
 * Shown right after signing in to an account that is scheduled for deletion:
 * keep the account (cancels the deletion) or sign out again (it stays
 * scheduled). Nothing else in the app opens until they choose.
 */
export default function AccountDeletionPage() {
  const router = useRouter();
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [busy, setBusy] = useState<"keep" | "leave" | null>(null);
  const [now] = useState(() => Date.now());

  const scheduledFor = typeof user?.deletion_scheduled_for === "string" ? user.deletion_scheduled_for : null;

  useEffect(() => {
    if (!_hasHydrated) return;
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !scheduledFor) router.replace(postLoginPath(user));
  }, [_hasHydrated, status, scheduledFor, user, router]);

  if (!_hasHydrated || status !== "authenticated" || !scheduledFor) return null;

  const daysLeft = Math.max(0, Math.ceil((new Date(scheduledFor).getTime() - now) / 86_400_000));

  async function keepAccount() {
    if (busy) return;
    setBusy("keep");
    try {
      const { user: profile } = await cancelAccountDeletion();
      const next = {
        id: profile.id,
        onboarded_at: profile.onboarded_at,
        privacy_policy_accepted: profile.privacy_policy_accepted,
        deletion_scheduled_for: profile.deletion_scheduled_for,
      };
      setUser(next);
      toast.success("Deletion cancelled. Welcome back");
      router.replace(postLoginPath(next));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't cancel the deletion. Try again.");
      setBusy(null);
    }
  }

  function leave() {
    if (busy) return;
    setBusy("leave");
    toast(`Signed out. Your account will be deleted on ${formatLongDate(scheduledFor!)}.`);
    performLogout();
  }

  return (
    <div className="flex min-h-screen flex-col px-4 pt-10 pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-none font-bold">Your account is being deleted</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          You asked to delete this account. Everything in it will be permanently deleted on{" "}
          <strong className="text-foreground">{formatLongDate(scheduledFor)}</strong>
          {daysLeft > 0 ? ` (in ${daysLeft} ${daysLeft === 1 ? "day" : "days"})` : ""}. Until then you can still change your mind.
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <Button size="xl" variant="light" className="w-full" disabled={!!busy} onClick={keepAccount}>
          {busy === "keep" && <Loader2 className="animate-spin" />}
          Cancel the deletion and sign me in
        </Button>
        <Button size="xl" variant="outline" className="w-full" disabled={!!busy} onClick={leave}>
          Sign me out. I still want it deleted
        </Button>
      </div>
    </div>
  );
}
