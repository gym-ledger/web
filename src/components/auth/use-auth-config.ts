"use client";

import { useEffect, useState } from "react";
import { getAuthConfig, type AuthConfig } from "@/lib/api/auth";

// Until the API answers, assume the most limited setup: phone numbers sign in
// with a password only. If phone codes are enabled, the option appears once
// the config loads rather than flashing in and then disappearing.
const FALLBACK: AuthConfig = { phoneOtpEnabled: false, captcha: null };

let configPromise: Promise<AuthConfig> | null = null;

function loadAuthConfig(): Promise<AuthConfig> {
  if (!configPromise) {
    configPromise = getAuthConfig().catch(() => {
      // Let the next mount retry instead of caching the failure.
      configPromise = null;
      return FALLBACK;
    });
  }
  return configPromise;
}

/** Which sign-in options this instance supports (see GET /auth/config). */
export function useAuthConfig(): AuthConfig {
  const [config, setConfig] = useState<AuthConfig>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    loadAuthConfig().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
