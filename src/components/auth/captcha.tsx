"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { AltchaWidgetElement } from "altcha/types/generic";
// JSX typing for <altcha-widget>.
import type {} from "altcha/types/react";
import type { CaptchaConfig } from "@/lib/api/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// We only check the proof-of-work, so the widget's interaction collector
// (pointer/typing timings added to the payload) is off: less data sent.
const WIDGET_CONFIGURATION = JSON.stringify({ humanInteractionSignature: false });

export interface CaptchaHandle {
  /**
   * A solved, single-use CAPTCHA payload for the next "send code" request,
   * or undefined when the instance has no CAPTCHA (or solving failed — the
   * API then answers with a "security check failed" error).
   */
  getToken: () => Promise<string | undefined>;
}

/**
 * Invisible self-hosted CAPTCHA (ALTCHA proof-of-work). It starts solving as
 * soon as it loads, so the first "Send code" rarely waits, and solves the next
 * one in the background after each use (for "Resend code").
 */
export function Captcha({ config, ref }: { config: CaptchaConfig | null; ref: Ref<CaptchaHandle> }) {
  const elRef = useRef<AltchaWidgetElement | null>(null);
  const pending = useRef<Promise<string | undefined> | null>(null);
  const [loaded, setLoaded] = useState(false);

  const enabled = config?.provider === "altcha";

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // A web component: load it on the client only.
    import("altcha").then(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  function solve() {
    const el = elRef.current;
    if (!el || typeof el.verify !== "function") return Promise.resolve(undefined);
    pending.current = el
      .verify()
      .then((result) => result?.payload)
      .catch(() => undefined);
    return pending.current;
  }

  useEffect(() => {
    const el = elRef.current;
    if (!loaded || !el) return;
    const prefetch = () => {
      if (!pending.current) void solve();
    };
    // Its methods exist once the widget has loaded.
    el.addEventListener("load", prefetch);
    if (typeof el.verify === "function") prefetch();
    return () => el.removeEventListener("load", prefetch);
  }, [loaded]);

  useImperativeHandle(ref, () => ({
    async getToken() {
      if (!enabled) return undefined;
      const token = await (pending.current ?? solve());
      // Each payload works once: start on the next one straight away.
      pending.current = null;
      elRef.current?.reset();
      void solve();
      return token;
    },
  }));

  if (!enabled || !loaded) return null;

  return (
    <altcha-widget
      ref={(el) => {
        elRef.current = el as AltchaWidgetElement | null;
      }}
      challenge={`${API_BASE}${config.challenge_path}`}
      display="invisible"
      configuration={WIDGET_CONFIGURATION}
    />
  );
}
