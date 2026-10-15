"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/old-ui/components/ui/button";
import { Input } from "@/old-ui/components/ui/input";
import { cn } from "@/lib/utils";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/auth/authStore";

type Step = "input" | "otp";
type Method = "email" | "phone";

interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string | number;
  user: { id: string; email?: string; phone_number?: string; phone_country_code?: string };
}

const COUNTRY_CODES = [
  { code: "+1", label: "+1  US/CA" },
  { code: "+44", label: "+44 UK" },
  { code: "+91", label: "+91 IN" },
  { code: "+61", label: "+61 AU" },
  { code: "+49", label: "+49 DE" },
  { code: "+33", label: "+33 FR" },
  { code: "+55", label: "+55 BR" },
  { code: "+81", label: "+81 JP" },
];

const RESEND_COOLDOWN = 60;

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [step, setStep] = useState<Step>("input");
  const [method, setMethod] = useState<Method>("email");

  // input step
  const [email, setEmail] = useState("user@user.com");
  const [phoneCode, setPhoneCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");

  // otp step
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCountdown]);

  const otp = otpDigits.join("");
  const contactLabel =
    method === "email" ? email : `${phoneCode} ${phoneNumber}`;

  function buildSendBody() {
    return method === "email"
      ? { method: "email", email }
      : { method: "phone", phoneNumber: { code: phoneCode, number: phoneNumber } };
  }

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/auth/login/send-otp", buildSendBody());
      setStep("otp");
      setOtpDigits(["", "", "", ""]);
      setResendCountdown(RESEND_COOLDOWN);
      setTimeout(() => otpRefs.current[0]?.focus(), 120);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(otpValue: string) {
    if (otpValue.length < 4 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const body = { ...buildSendBody(), otp: otpValue };
      const data = await apiClient.post<VerifyResponse>("/auth/login/verify-otp", body);
      setTokens(
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpiresAt: data.accessTokenExpiresAt,
        },
        data.user,
      );
      router.push("/old/home");
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

  function handleOtpInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 3) {
      otpRefs.current[index + 1]?.focus();
    } else if (digit && index === 3 && next.every(Boolean)) {
      otpRefs.current[index]?.blur();
      submitOtp(next.join(""));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const next = ["", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setOtpDigits(next);
    otpRefs.current[Math.min(text.length, 3)]?.focus();
    if (text.length === 4) submitOtp(text);
  }

  function switchMethod() {
    setMethod((m) => (m === "email" ? "phone" : "email"));
    setEmail("");
    setPhoneNumber("");
    setError(null);
  }

  function goBack() {
    setStep("input");
    setOtpDigits(["", "", "", ""]);
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-sm"
      >
        {/* Logo + heading */}
        <div className="mb-10 flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
            <span className="text-2xl font-black text-primary">A</span>
          </div>
          <AnimatePresence mode="wait">
            {step === "input" ? (
              <motion.div
                key="head-input"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center gap-1 text-center"
              >
                <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Sign in to your APEX account</p>
              </motion.div>
            ) : (
              <motion.div
                key="head-otp"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center gap-1 text-center"
              >
                <h1 className="text-2xl font-bold text-foreground">
                  Check your {method === "email" ? "inbox" : "phone"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  We sent a 4-digit code to
                </p>
                <p className="text-sm font-semibold text-foreground">{contactLabel}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* OAuth buttons — only on input step */}
        <AnimatePresence>
          {step === "input" && (
            <motion.div
              key="oauth"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mb-6 flex flex-col gap-3">
                <button className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary/50 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                  <svg className="size-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity="0.5" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.7" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" opacity="0.6" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
                <button className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary/50 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Continue with Apple
                </button>
              </div>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                {method === "email" ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl text-base"
                      required
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Mobile number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        className="h-12 w-28 shrink-0 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {COUNTRY_CODES.map(({ code, label }) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder="10-digit number"
                        value={phoneNumber}
                        onChange={(e) =>
                          setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        className="h-12 flex-1 rounded-xl text-base"
                        required
                        autoFocus
                        pattern="[0-9]{10}"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "mt-1 h-12 rounded-xl text-base font-semibold",
                    loading && "opacity-70",
                  )}
                >
                  {loading ? "Sending code…" : "Send code"}
                </Button>
              </form>

              {/* Method toggle */}
              <button
                type="button"
                onClick={switchMethod}
                className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {method === "email" ? (
                  <>
                    <Phone className="size-3.5" />
                    Sign in with mobile number instead
                  </>
                ) : (
                  <>
                    <Mail className="size-3.5" />
                    Sign in with email instead
                  </>
                )}
              </button>
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
                {/* 4-digit OTP inputs */}
                <div className="flex justify-center gap-3">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className={cn(
                        "size-14 rounded-xl border-2 border-input bg-input/20 text-center text-2xl font-bold text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring",
                        digit && "border-primary/60 ring-1 ring-primary/20",
                      )}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-center text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className={cn(
                    "h-12 rounded-xl text-base font-semibold",
                    (loading || otp.length < 4) && "opacity-70",
                  )}
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
                    Change {method === "email" ? "email" : "number"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign up link */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/old/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
