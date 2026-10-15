"use client";

import { Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Identity } from "@/lib/api/auth";

export type IdentityMethod = Identity["method"];

export interface IdentityValue {
  method: IdentityMethod;
  email: string;
  phoneCode: string;
  phoneNumber: string;
}

export const COUNTRY_CODES = [
  { code: "+1", label: "+1  US/CA" },
  { code: "+44", label: "+44 UK" },
  { code: "+91", label: "+91 IN" },
  { code: "+61", label: "+61 AU" },
  { code: "+49", label: "+49 DE" },
  { code: "+33", label: "+33 FR" },
  { code: "+55", label: "+55 BR" },
  { code: "+81", label: "+81 JP" },
];

export const emptyIdentity = (): IdentityValue => ({
  method: "email",
  email: "",
  phoneCode: "+1",
  phoneNumber: "",
});

export function toIdentity(v: IdentityValue): Identity {
  return v.method === "email"
    ? { method: "email", email: v.email.trim() }
    : { method: "phone", phoneNumber: { code: v.phoneCode, number: v.phoneNumber } };
}

export function identityLabel(v: IdentityValue) {
  return v.method === "email" ? v.email.trim() : `${v.phoneCode} ${v.phoneNumber}`;
}

/** Email or mobile number input — the field auth forms open with. */
export function IdentityField({
  value,
  onChange,
  autoFocus,
}: {
  value: IdentityValue;
  onChange: (v: IdentityValue) => void;
  autoFocus?: boolean;
}) {
  if (value.method === "email") {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor="identity-email" className="label-caps">
          Email
        </label>
        <Input
          id="identity-email"
          type="email"
          autoComplete="email"
          placeholder="alex@example.com"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          className="h-13 rounded-xl text-base"
          required
          autoFocus={autoFocus}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="identity-phone" className="label-caps">
        Mobile number
      </label>
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={value.phoneCode}
          onChange={(e) => onChange({ ...value, phoneCode: e.target.value })}
          className="h-13 w-28 shrink-0 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
        >
          {COUNTRY_CODES.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <Input
          id="identity-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="10-digit number"
          value={value.phoneNumber}
          onChange={(e) => onChange({ ...value, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          className="h-13 flex-1 rounded-xl text-base"
          required
          autoFocus={autoFocus}
          pattern="[0-9]{10}"
        />
      </div>
    </div>
  );
}

/** Text button that flips the identity field between email and phone. */
export function IdentityMethodToggle({
  value,
  onChange,
  verb = "Sign in",
}: {
  value: IdentityValue;
  onChange: (v: IdentityValue) => void;
  verb?: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange({ ...value, method: value.method === "email" ? "phone" : "email", email: "", phoneNumber: "" })
      }
      className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
    >
      {value.method === "email" ? (
        <>
          <Phone className="size-3.5" />
          {verb} with mobile number instead
        </>
      ) : (
        <>
          <Mail className="size-3.5" />
          {verb} with email instead
        </>
      )}
    </button>
  );
}
