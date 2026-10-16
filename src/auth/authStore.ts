"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthStatus, AuthTokens, AuthUser } from "./authTypes";
import { STORAGE_KEY, normalizeExpiresAt } from "./authConstants";
import { clearApiResponseCache } from "@/lib/offline/apiResponseCache";

interface AuthState {
  _hasHydrated: boolean;
  status: AuthStatus;
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  /**
   * Whether this browser signed in and hasn't signed out. The refresh token
   * itself lives in an httpOnly cookie JS can't see, so this flag is what
   * tells the app a refresh is worth attempting on start-up.
   */
  hasSession: boolean;
  user: AuthUser | null;

  setHasHydrated: (v: boolean) => void;
  setStatus: (status: AuthStatus) => void;
  setTokens: (tokens: AuthTokens, user?: AuthUser) => void;
  setAccessToken: (accessToken: string, expiresAt: number) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      status: "loading",
      accessToken: null,
      accessTokenExpiresAt: null,
      hasSession: false,
      user: null,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setStatus: (status) => set({ status }),

      setTokens: (tokens, user) => {
        set({
          accessToken: tokens.accessToken,
          accessTokenExpiresAt: normalizeExpiresAt(tokens.accessTokenExpiresAt),
          hasSession: true,
          user: user ?? null,
          status: "authenticated",
        });
      },

      setAccessToken: (accessToken, expiresAt) => {
        set({ accessToken, accessTokenExpiresAt: expiresAt, hasSession: true, status: "authenticated" });
      },

      clearAuth: () => {
        // Offline copies of API data belong to this user.
        void clearApiResponseCache();
        set({
          accessToken: null,
          accessTokenExpiresAt: null,
          hasSession: false,
          user: null,
          status: "unauthenticated",
        });
      },
    }),
    {
      name: STORAGE_KEY,
      // v0 persisted the refresh token itself. v1 drops it from storage
      // (it now lives in an httpOnly cookie), so a v0 session signs in again.
      version: 1,
      migrate: () => ({ hasSession: false }),
      partialize: (state) => ({ hasSession: state.hasSession }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHasHydrated(true);
        if (!state.hasSession) {
          state.clearAuth();
        }
        // If a session exists, status stays "loading" until authBootstrap refreshes it
      },
    },
  ),
);
