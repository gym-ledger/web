"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/auth/authStore";
import { postLoginPath } from "@/auth/postLoginPath";
import { loginWithPassword, sendLoginOtp, verifyLoginOtp, type LoginResponse } from "@/lib/api/auth";
import {
  IdentityField,
  IdentityMethodToggle,
  emptyIdentity,
  identityLabel,
  toIdentity,
  type IdentityValue,
} from "@/components/auth/identity-field";
import { useAuthConfig } from "@/components/auth/use-auth-config";
import { Captcha, type CaptchaHandle } from "@/components/auth/captcha";
import { OtpInput, OTP_LENGTH, emptyOtp } from "@/components/auth/otp-input";
import { PasswordField } from "@/components/auth/password-field";

type Step = "input" | "otp";
type Mode = "code" | "password";

const RESEND_COOLDOWN = 60;

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [step, setStep] = useState<Step>("input");
  const [mode, setMode] = useState<Mode>("code");

  // input step
  const [identity, setIdentity] = useState<IdentityValue>(emptyIdentity);
  const [password, setPassword] = useState("");

  // Codes always go to email; to phone numbers only when the instance has
  // WhatsApp delivery set up. Otherwise phone numbers sign in by password.
  const { phoneOtpEnabled, captcha: captchaConfig } = useAuthConfig();
  const captchaRef = useRef<CaptchaHandle>(null);
  const codeAvailable = identity.method === "email" || phoneOtpEnabled;
  const activeMode: Mode = codeAvailable ? mode : "password";

  // otp step
  const [otpDigits, setOtpDigits] = useState(emptyOtp);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCountdown]);

  const otp = otpDigits.join("");

  function signIn(data: LoginResponse) {
    setTokens(
      {
        accessToken: data.accessToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
      },
      data.user,
    );
    router.push(postLoginPath(data.user));
  }

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendLoginOtp(toIdentity(identity), await captchaRef.current?.getToken());
      setStep("otp");
      setOtpDigits(emptyOtp());
      setResendCountdown(RESEND_COOLDOWN);
      setTimeout(() => otpRefs.current[0]?.focus(), 120);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      signIn(await loginWithPassword(toIdentity(identity), password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed. Try again.");
      setLoading(false);
    }
  }

  async function submitOtp(otpValue: string) {
    if (otpValue.length < OTP_LENGTH || loading) return;
    setLoading(true);
    setError(null);
    try {
      signIn(await verifyLoginOtp(toIdentity(identity), otpValue));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    submitOtp(otp);
  }

  function changeIdentity(next: IdentityValue) {
    setIdentity(next);
    setError(null);
  }

  function switchMode() {
    setMode((m) => (m === "code" ? "password" : "code"));
    setPassword("");
    setError(null);
  }

  function goBack() {
    setStep("input");
    setOtpDigits(emptyOtp());
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Captcha config={captchaConfig} ref={captchaRef} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-sm"
      >
        {/* Logo + heading */}
        <div className="mb-10 flex flex-col items-start gap-6">
          <span className="font-display text-[40px] leading-none font-bold tracking-[0.04em]">
            APEX<span className="text-primary">.</span>
          </span>
          <AnimatePresence mode="wait">
            {step === "input" ? (
              <motion.div
                key="head-input"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-1"
              >
                <span className="label-caps text-primary">Sign in</span>
                <h1 className="font-display text-[34px] leading-none font-bold">Let&apos;s train.</h1>
                <p className="text-sm text-muted-foreground">
                  {activeMode === "code"
                    ? "We'll send a one-time code — no password needed."
                    : "Sign in with your password."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="head-otp"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-1"
              >
                <span className="label-caps text-primary">Verify</span>
                <h1 className="font-display text-[34px] leading-none font-bold">
                  Check your {identity.method === "email" ? "inbox" : "phone"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  We sent a {OTP_LENGTH}-digit code to
                </p>
                <p className="text-sm font-semibold text-foreground">{identityLabel(identity)}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main form area */}
        <AnimatePresence mode="wait">
          {step === "input" ? (
            <motion.div
              key="step-input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <form
                onSubmit={activeMode === "code" ? handleSendOtp : handlePasswordLogin}
                className="flex flex-col gap-3"
              >
                <IdentityField value={identity} onChange={changeIdentity} autoFocus />

                {activeMode === "password" && (
                  <>
                    <PasswordField
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      autoComplete="current-password"
                    />
                    <Link
                      href="/forgot-password"
                      className="-mt-1 flex min-h-11 items-center self-end text-sm font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  size="xl"
                  variant="light"
                  className={cn("mt-1 w-full", loading && "opacity-70")}
                >
                  {activeMode === "code"
                    ? loading ? "Sending code…" : "Send code"
                    : loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              <div className="mt-4 flex flex-col">
                <IdentityMethodToggle value={identity} onChange={changeIdentity} />
                {codeAvailable && (
                  <button
                    type="button"
                    onClick={switchMode}
                    className="flex min-h-11 w-full items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    {activeMode === "code" ? "Use a password instead" : "Send me a code instead"}
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22 }}
              onAnimationComplete={() => {
                // mode="wait" on the outer AnimatePresence delays mounting
                // this div until the input step's exit finishes, so a fixed
                // setTimeout after setStep("otp") can fire before the input
                // exists. Focusing on this step's own enter-complete instead
                // guarantees the node is mounted. (Also fires on this div's
                // exit; the step guard makes that a no-op.)
                if (step === "otp") otpRefs.current[0]?.focus();
              }}
            >
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                <OtpInput
                  digits={otpDigits}
                  onChange={setOtpDigits}
                  onComplete={submitOtp}
                  inputRefs={otpRefs}
                />

                {error && (
                  <p className="text-center text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length < OTP_LENGTH}
                  size="xl"
                  variant="light"
                  className={cn("w-full", (loading || otp.length < OTP_LENGTH) && "opacity-70")}
                >
                  {loading ? "Verifying…" : "Verify & sign in"}
                </Button>

                <div className="flex flex-col items-center gap-2.5">
                  {resendCountdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend in{" "}
                      <span className="tabular-nums font-semibold text-foreground">
                        {resendCountdown}s
                      </span>
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
                    onClick={goBack}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" />
                    Change {identity.method === "email" ? "email" : "number"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-[13px] text-muted-foreground">
          {activeMode === "code"
            ? "New here? The same code creates your account."
            : codeAvailable
              ? "No password yet? Sign in with a code, then set one in Profile → Settings."
              : "New here, or no password yet? Sign in with your email to get a code."}
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">
          New accounts are asked to accept the{" "}
          <Link href="/privacy" className="font-semibold text-primary">
            privacy policy
          </Link>{" "}
          after the first sign-in.
        </p>
      </motion.div>
    </div>
  );
}
