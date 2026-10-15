"use client";

import { useEffect } from "react";
import { useAuthStore } from "./authStore";
import { getValidAccessToken, initBroadcastChannel, performLogout, TransientRefreshError } from "./tokenManager";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    return initBroadcastChannel();
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (status !== "loading") return;

    getValidAccessToken().catch((err) => {
      // Opened offline (or the API is briefly down): the stored session is
      // still good, so let the user into the app — every API call refreshes
      // the access token itself once the network is back.
      if (err instanceof TransientRefreshError) {
        useAuthStore.getState().setStatus("authenticated");
        return;
      }
      performLogout();
    });
  }, [_hasHydrated, status]);

  return children as React.ReactElement;
}
