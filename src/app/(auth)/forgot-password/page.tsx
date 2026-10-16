"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  PASSWORD_MIN_LENGTH,
  resetPassword,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
} from "@/lib/api/auth";
import {
  IdentityField,
  IdentityMethodToggle,
  emptyIdentity,
  identityLabel,
  toIdentity,
  type IdentityValue,
} from "@/components/auth/identity-field";
import { useAuthConfig } from "@/components/auth/use-auth-config";
import { OtpInput, OTP_LENGTH, emptyOtp } from "@/components/auth/otp-input";
import { PasswordField } from "@/components/auth/password-field";

type Step = "input" | "otp" | "password" | "done";

const RESEND_COOLDOWN = 60;

const HEADINGS: Record<Step, { eyebrow: string; title: string }> = {
  input: { eyebrow: "Forgot password", title: "Reset it." },
  otp: { eyebrow: "Verify", title: "Enter your code" },
  password: { eyebrow: "New password", title: "Pick a new one." },
  done: { eyebrow: "Done", title: "Password reset." },
};

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("input");
  const [identity, setIdentity] = useState<IdentityValue>(emptyIdentity);
  const { phoneOtpEnabled } = useAuthConfig();
  const [otpDigits, setOtpDigits] = useState(emptyOtp);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCountdown]);

  const otp = otpDigits.join("");
  const passwordTooShort = newPassword.length > 0 && newPassword.length < PASSWORD_MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canReset = newPassword.length >= PASSWORD_MIN_LENGTH && confirmPassword === newPassword;

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetOtp(toIdentity(identity));
      setStep("otp");
      setOtpDigits(emptyOtp());
      setResendCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(otpValue: string) {
    if (otpValue.length < OTP_LENGTH || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { resetToken } = await verifyPasswordResetOtp(toIdentity(identity), otpValue);
      setResetToken(resetToken);
      setStep("password");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken || !canReset || loading) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(resetToken, newPassword);
      setResetToken(null);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setStep("input");
    setOtpDigits(emptyOtp());
    setResetToken(null);
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  const heading = HEADINGS[step];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-sm"
      >
        {step !== "done" && (
          <Link
            href="/login"
            className="mb-8 flex min-h-11 w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
            onAnimationComplete={() => {
              // See the login page: focus once this step has actually mounted.
              if (step === "otp") otpRefs.current[0]?.focus();
            }}
          >
            <div className="mb-8 flex flex-col gap-1">
              <span className={cn("label-caps", step === "done" ? "text-success" : "text-primary")}>
                {heading.eyebrow}
              </span>
              <h1 className="font-display text-[34px] leading-none font-bold">{heading.title}</h1>
              {step === "input" && (
                <p className="text-sm text-muted-foreground">
                  We&apos;ll send a {OTP_LENGTH}-digit code to the email or number on your account.
                </p>
              )}
              {step === "otp" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    If there&apos;s an account for this {identity.method === "email" ? "email" : "number"}, we sent a code to
                  </p>
                  <p className="text-sm font-semibold text-foreground">{identityLabel(identity)}</p>
                </>
              )}
              {step === "password" && (
                <p className="text-sm text-muted-foreground">
                  At least {PASSWORD_MIN_LENGTH} characters. You&apos;ll be signed out on every device.
                </p>
              )}
            </div>

            {step === "input" && (
              <>
                <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                  <IdentityField value={identity} onChange={(v) => { setIdentity(v); setError(null); }} autoFocus />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button
                    type="submit"
                    disabled={loading}
                    size="xl"
                    variant="light"
                    className={cn("mt-1 w-full", loading && "opacity-70")}
                  >
                    {loading ? "Sending code…" : "Send code"}
                  </Button>
                </form>
                {/* Resetting needs a code, so phone numbers are offered only when phone codes are enabled. */}
                {phoneOtpEnabled && (
                  <div className="mt-4">
                    <IdentityMethodToggle
                      value={identity}
                      onChange={(v) => { setIdentity(v); setError(null); }}
                      verb="Reset"
                    />
                  </div>
                )}
              </>
            )}

            {step === "otp" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitOtp(otp);
                }}
                className="flex flex-col gap-5"
              >
                <OtpInput digits={otpDigits} onChange={setOtpDigits} onComplete={submitOtp} inputRefs={otpRefs} />
                {error && <p className="text-center text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading || otp.length < OTP_LENGTH}
                  size="xl"
                  variant="light"
                  className={cn("w-full", (loading || otp.length < OTP_LENGTH) && "opacity-70")}
                >
                  {loading ? "Verifying…" : "Verify code"}
                </Button>
                <div className="flex flex-col items-center gap-2.5">
                  {resendCountdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend in{" "}
                      <span className="tabular-nums font-semibold text-foreground">{resendCountdown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={loading}
                      className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={startOver}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" />
                    Change {identity.method === "email" ? "email" : "number"}
                  </button>
                </div>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handleReset} className="flex flex-col gap-3">
                <PasswordField
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  autoFocus
                  hint={passwordTooShort ? `${PASSWORD_MIN_LENGTH - newPassword.length} more characters` : undefined}
                />
                <PasswordField
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
                {mismatch && <p className="text-sm text-destructive">Passwords don&apos;t match</p>}
                {error && (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-destructive">{error}</p>
                    <button
                      type="button"
                      onClick={startOver}
                      className="w-fit text-sm font-medium text-primary hover:underline"
                    >
                      Start over
                    </button>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={loading || !canReset}
                  size="xl"
                  variant="light"
                  className={cn("mt-1 w-full", (loading || !canReset) && "opacity-70")}
                >
                  {loading ? "Saving…" : "Reset password"}
                </Button>
              </form>
            )}

            {step === "done" && (
              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-3 rounded-xl border border-success-line bg-success-surface p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  <p className="text-sm">
                    Your password has been changed and every device has been signed out. Sign in with your new
                    password.
                  </p>
                </div>
                <Button asChild size="xl" variant="light" className="w-full">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
