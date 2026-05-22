"use client";

import { useEffect } from "react";
import { useAuthStore } from "./authStore";
import { getValidAccessToken, initBroadcastChannel, performLogout } from "./tokenManager";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    return initBroadcastChannel();
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (status !== "loading") return;

    getValidAccessToken().catch(() => {
      performLogout();
    });
  }, [_hasHydrated, status]);

  return children as React.ReactElement;
}
