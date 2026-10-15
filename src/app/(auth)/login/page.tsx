"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      router.push("/home");
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
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
                <p className="text-sm text-muted-foreground">We&apos;ll send a one-time code — no password needed.</p>
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
                    <label className="label-caps">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-13 rounded-xl text-base"
                      required
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="label-caps">
                      Mobile number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        className="h-13 w-28 shrink-0 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
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
                        className="h-13 flex-1 rounded-xl text-base"
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
                  size="xl"
                  variant="light"
                  className={cn("mt-1 w-full", loading && "opacity-70")}
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
                <div className="flex justify-between gap-3">
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
                        "num size-16 rounded-2xl border-2 border-input bg-background text-center text-[34px] text-foreground transition-colors outline-none focus:border-primary",
                        digit && "border-foreground/60",
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
                  size="xl"
                  variant="light"
                  className={cn("w-full", (loading || otp.length < 4) && "opacity-70")}
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

        <p className="mt-8 text-[13px] text-muted-foreground">
          New here? The same code creates your account.
        </p>
      </motion.div>
    </div>
  );
}
