"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export const OTP_LENGTH = 6;
export const emptyOtp = () => Array<string>(OTP_LENGTH).fill("");

/**
 * One box per digit. Calls `onComplete` once every box is filled, by typing
 * the last digit or by pasting the whole code.
 */
export function OtpInput({
  digits,
  onChange,
  onComplete,
  inputRefs,
}: {
  digits: string[];
  onChange: (digits: string[]) => void;
  onComplete: (otp: string) => void;
  /** Lets the parent focus the first box once its step has mounted. */
  inputRefs?: React.RefObject<(HTMLInputElement | null)[]>;
}) {
  const ownRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));
  const refs = inputRefs ?? ownRefs;

  function handleInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next);
    if (digit && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    } else if (digit && index === OTP_LENGTH - 1 && next.every(Boolean)) {
      refs.current[index]?.blur();
      onComplete(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = emptyOtp();
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    onChange(next);
    refs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
    if (text.length === OTP_LENGTH) onComplete(text);
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label={`${OTP_LENGTH}-digit code`}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          value={digit}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={cn(
            "num size-12 rounded-xl border-2 border-input bg-background text-center text-[26px] text-foreground transition-colors outline-none focus:border-primary",
            digit && "border-foreground/60",
          )}
        />
      ))}
    </div>
  );
}
