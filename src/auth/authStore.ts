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
  refreshToken: string | null;
  user: AuthUser | null;

  setHasHydrated: (v: boolean) => void;
  setStatus: (status: AuthStatus) => void;
  setTokens: (tokens: AuthTokens, user?: AuthUser) => void;
  setAccessToken: (accessToken: string, expiresAt: number) => void;
  setRefreshToken: (refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      status: "loading",
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      user: null,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setStatus: (status) => set({ status }),

      setTokens: (tokens, user) => {
        set({
          accessToken: tokens.accessToken,
          accessTokenExpiresAt: normalizeExpiresAt(tokens.accessTokenExpiresAt),
          refreshToken: tokens.refreshToken,
          user: user ?? null,
          status: "authenticated",
        });
      },

      setAccessToken: (accessToken, expiresAt) => {
        set({ accessToken, accessTokenExpiresAt: expiresAt, status: "authenticated" });
      },

      setRefreshToken: (refreshToken) => {
        set({ refreshToken });
      },

      clearAuth: () => {
        // Offline copies of API data belong to this user.
        void clearApiResponseCache();
        set({
          accessToken: null,
          accessTokenExpiresAt: null,
          refreshToken: null,
          user: null,
          status: "unauthenticated",
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHasHydrated(true);
        if (!state.refreshToken) {
          state.clearAuth();
        }
        // If refreshToken present, status stays "loading" until authBootstrap validates it
      },
    },
  ),
);
