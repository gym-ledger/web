"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/auth/password-field";
import { ApiError } from "@/lib/api-client";
import {
  sendEmailChangeCode,
  sendEmailChangeConfirmCode,
  verifyEmailChange,
  type ConfirmMethod,
} from "@/lib/api/account";
import type { UserProfile } from "@/lib/api/profile";

function CodeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder="6-digit code"
      aria-label={label}
      className="num h-14 rounded-xl border border-input bg-background px-4 text-center text-[24px] tracking-[0.3em] outline-none focus:border-primary"
    />
  );
}

const isCode = (v: string) => /^[0-9]{6}$/.test(v);

/**
 * Changes the signed-in user's email (or adds one, for accounts without).
 * First they confirm it's them (password, or a code to their current
 * email/phone), then they enter the code sent to the new address. The email
 * only changes once that code is right.
 */
export function ChangeEmailDrawer({
  open,
  currentEmail,
  confirmWith,
  onClose,
  onChanged,
}: {
  open: boolean;
  currentEmail: string | null;
  confirmWith: ConfirmMethod;
  onClose: () => void;
  onChanged: (user: UserProfile) => void;
}) {
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [confirmCodeSent, setConfirmCodeSent] = useState(false);
  // Proof the user already confirmed it's them; lets resends and a corrected address skip that.
  const [changeToken, setChangeToken] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState<"confirm-code" | "send" | "resend" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start blank each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep("enter");
      setEmail("");
      setPassword("");
      setConfirmCode("");
      setConfirmCodeSent(false);
      setChangeToken(null);
      setNewCode("");
      setError(null);
    }
  }

  const adding = !currentEmail;
  const usesCode = confirmWith === "email_code" || confirmWith === "phone_code";
  const confirmed =
    !!changeToken || (confirmWith === "password" ? password.length > 0 : usesCode && isCode(confirmCode));
  const canSend = email.trim().length > 0 && confirmed && !busy;

  const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

  // The confirmation lasts a few minutes; once it has expired, go back and confirm again.
  function handleFailure(err: unknown, fallback: string) {
    setError(message(err, fallback));
    if (err instanceof ApiError && /start again/i.test(err.message)) {
      setChangeToken(null);
      setPassword("");
      setConfirmCode("");
      setConfirmCodeSent(false);
      setStep("enter");
    }
  }

  async function handleSendConfirmCode() {
    setBusy("confirm-code");
    setError(null);
    try {
      const { sent_to } = await sendEmailChangeConfirmCode();
      setConfirmCodeSent(true);
      toast.success(sent_to === "email" ? "Code sent to your current email" : "Code sent on WhatsApp");
    } catch (err) {
      setError(message(err, "Couldn't send the code"));
    } finally {
      setBusy(null);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setBusy("send");
    setError(null);
    try {
      const target = email.trim();
      const proof = changeToken
        ? { change_token: changeToken }
        : confirmWith === "password"
          ? { password }
          : { code: confirmCode };
      const res = await sendEmailChangeCode({ email: target, ...proof });
      setChangeToken(res.change_token);
      setEmail(res.email);
      setNewCode("");
      setStep("verify");
    } catch (err) {
      handleFailure(err, "Couldn't send the code");
    } finally {
      setBusy(null);
    }
  }

  async function handleResend() {
    if (!changeToken) return;
    setBusy("resend");
    setError(null);
    try {
      await sendEmailChangeCode({ email, change_token: changeToken });
      toast.success("New code sent");
    } catch (err) {
      handleFailure(err, "Couldn't send a new code");
    } finally {
      setBusy(null);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!changeToken || !isCode(newCode) || busy) return;
    setBusy("verify");
    setError(null);
    try {
      const { user } = await verifyEmailChange({ email, code: newCode, change_token: changeToken });
      toast.success(adding ? "Email added" : "Email changed");
      onChanged(user);
      onClose();
    } catch (err) {
      handleFailure(err, "Couldn't confirm the code");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && busy !== "verify" && onClose()}>
      <DrawerContent>
        {step === "enter" ? (
          <form onSubmit={handleSend} className="overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>{adding ? "Add an email" : "Change your email"}</DrawerTitle>
            </DrawerHeader>

            <div className="flex flex-col gap-4 px-4 pb-2 text-[15px] leading-relaxed">
              {currentEmail && (
                <p className="text-[13px] text-muted-foreground">
                  Now: <span className="text-foreground">{currentEmail}</span>
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-email" className="label-caps">
                  {adding ? "Email" : "New email"}
                </label>
                <Input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  className="h-13 rounded-xl text-base"
                  required
                  autoFocus
                />
                <p className="text-[13px] text-muted-foreground">
                  We&apos;ll send a code to it. Nothing changes until you enter that code.
                </p>
              </div>

              {!changeToken && confirmWith === "password" && (
                <PasswordField
                  label="Your password, to confirm it's you"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
              )}

              {!changeToken && usesCode && (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-muted-foreground">
                    To confirm it&apos;s you, we&apos;ll send a 6-digit code to your current{" "}
                    {confirmWith === "email_code" ? "email" : "phone (WhatsApp)"}.
                  </p>
                  {confirmCodeSent && (
                    <CodeInput value={confirmCode} onChange={setConfirmCode} label="Confirmation code" />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="xl"
                    disabled={!!busy}
                    onClick={handleSendConfirmCode}
                  >
                    {busy === "confirm-code" && <Loader2 className="animate-spin" />}
                    {confirmCodeSent ? "Send a new code" : "Send me a code"}
                  </Button>
                </div>
              )}

              {!changeToken && confirmWith === null && (
                <p className="rounded-xl border border-warning-line bg-warning-surface p-3 text-[13px]">
                  Set a password in Settings first, then use it here to confirm.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DrawerFooter>
              <Button type="submit" size="xl" disabled={!canSend}>
                {busy === "send" && <Loader2 className="animate-spin" />}
                Send code to {adding ? "this email" : "new email"}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </DrawerFooter>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>Check your inbox</DrawerTitle>
            </DrawerHeader>

            <div className="flex flex-col gap-4 px-4 pb-2 text-[15px] leading-relaxed">
              <p>
                Enter the 6-digit code we sent to <strong className="break-all">{email}</strong>.
              </p>
              <CodeInput value={newCode} onChange={setNewCode} label="Code from the new email" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleResend}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-input bg-card px-3 text-[13px] font-semibold disabled:opacity-50"
                >
                  {busy === "resend" && <Loader2 className="size-3.5 animate-spin" />}
                  Send a new code
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => {
                    setError(null);
                    setStep("enter");
                  }}
                  className="h-9 rounded-full border border-input bg-card px-3 text-[13px] font-semibold disabled:opacity-50"
                >
                  Use a different email
                </button>
              </div>
              {!adding && (
                <p className="text-[13px] text-muted-foreground">
                  Once it&apos;s confirmed, you&apos;ll sign in with the new email and we&apos;ll let your old address know.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DrawerFooter>
              <Button type="submit" size="xl" disabled={!isCode(newCode) || !!busy}>
                {busy === "verify" && <Loader2 className="animate-spin" />}
                Confirm {adding ? "email" : "new email"}
              </Button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy === "verify"}
                className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {adding ? "Cancel" : "Cancel — keep my current email"}
              </button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
