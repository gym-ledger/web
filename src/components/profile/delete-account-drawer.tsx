"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/password-field";
import { performLogout } from "@/auth/tokenManager";
import { ApiError } from "@/lib/api-client";
import { requestAccountDeletion, sendDeletionCode, type DeletionConfirmMethod } from "@/lib/api/account";
import { formatLongDate } from "@/lib/format-date";
import { PRIVACY_DELETION_SECTION_ID } from "@/lib/privacy-policy";

/**
 * Asks for an account deletion: explains what happens, then confirms with
 * the password (or, without one, a code sent to the user). On success every
 * device is signed out, this one included.
 */
export function DeleteAccountDrawer({
  open,
  confirmWith,
  graceDays,
  onClose,
}: {
  open: boolean;
  confirmWith: DeletionConfirmMethod;
  graceDays: number;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start blank each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPassword("");
      setCode("");
      setCodeSent(false);
      setUnderstood(false);
      setError(null);
    }
  }

  // The date the account would be deleted if confirmed now.
  const [openedAt] = useState(() => Date.now());
  const deletionDate = formatLongDate(new Date(openedAt + graceDays * 86_400_000).toISOString());
  const usesCode = confirmWith === "email_code" || confirmWith === "phone_code";
  const confirmed = confirmWith === "password" ? password.length > 0 : usesCode && /^[0-9]{6}$/.test(code);
  const canDelete = understood && confirmed && !deleting;

  async function handleSendCode() {
    setSendingCode(true);
    setError(null);
    try {
      const { sent_to } = await sendDeletionCode();
      setCodeSent(true);
      toast.success(sent_to === "email" ? "Code sent to your email" : "Code sent on WhatsApp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the code");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const { deletion_scheduled_for } = await requestAccountDeletion(
        confirmWith === "password" ? { password } : { code },
      );
      toast(`Signed out everywhere. Your account will be deleted on ${formatLongDate(deletion_scheduled_for)}. Sign in before then to cancel.`, {
        duration: 10_000,
      });
      performLogout();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete your account");
      setDeleting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && !deleting && onClose()}>
      <DrawerContent>
        <form onSubmit={handleDelete} className="overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>Delete your account</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-3 px-4 pb-2 text-[15px] leading-relaxed">
            <ul className="flex flex-col">
              <li className="border-b border-line py-2.5">You&apos;ll be signed out on every device straight away.</li>
              <li className="border-b border-line py-2.5">
                Everything in your account (workouts, plans, body weight, goals, settings) is permanently deleted on{" "}
                <strong>{deletionDate}</strong>, {graceDays} days from now.
              </li>
              <li className="border-b border-line py-2.5">Changed your mind? Sign in before then and you can cancel it.</li>
              <li className="py-2.5 text-muted-foreground">
                Only anonymous monthly totals that include no trace of you are kept.{" "}
                <Link href={`/privacy#${PRIVACY_DELETION_SECTION_ID}`} className="font-semibold text-primary">
                  What&apos;s kept
                </Link>
              </li>
            </ul>

            {confirmWith === "password" && (
              <PasswordField
                label="Enter your password to confirm"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
            )}

            {usesCode && (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-muted-foreground">
                  To confirm, we&apos;ll send a 6-digit code to your {confirmWith === "email_code" ? "email" : "phone (WhatsApp)"}.
                </p>
                {codeSent ? (
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit code"
                    aria-label="Confirmation code"
                    className="num h-14 rounded-xl border border-input bg-background px-4 text-center text-[24px] tracking-[0.3em] outline-none focus:border-primary"
                  />
                ) : null}
                <Button type="button" variant="outline" size="xl" disabled={sendingCode} onClick={handleSendCode}>
                  {sendingCode && <Loader2 className="animate-spin" />}
                  {codeSent ? "Send a new code" : "Send me a code"}
                </Button>
              </div>
            )}

            {confirmWith === null && (
              <p className="rounded-xl border border-warning-line bg-warning-surface p-3 text-[13px]">
                Set a password in Settings first, then use it here to confirm.
              </p>
            )}

            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-destructive"
              />
              <span>I understand my account and its data will be permanently deleted on {deletionDate}.</span>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DrawerFooter>
            <Button type="submit" size="xl" variant="destructive" disabled={!canDelete}>
              {deleting && <Loader2 className="animate-spin" />}
              Delete my account
            </Button>
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Keep my account
            </button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
