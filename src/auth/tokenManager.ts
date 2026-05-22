import { useAuthStore } from "./authStore";
import {
  ACCESS_TOKEN_EXPIRY_BUFFER_MS,
  REFRESH_ENDPOINT,
  API_BASE,
  BROADCAST_CHANNEL_NAME,
  normalizeExpiresAt,
} from "./authConstants";
import type { AuthBroadcastEvent } from "./authTypes";

let activeRefreshPromise: Promise<string> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

export function initBroadcastChannel(): () => void {
  if (typeof window === "undefined") return () => {};

  broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

  broadcastChannel.onmessage = (event: MessageEvent<AuthBroadcastEvent>) => {
    const msg = event.data;
    if (msg.type === "TOKEN_REFRESHED") {
      useAuthStore.getState().setAccessToken(msg.accessToken, msg.accessTokenExpiresAt);
    } else if (msg.type === "REFRESH_TOKEN_ROTATED") {
      useAuthStore.getState().setRefreshToken(msg.refreshToken);
    } else if (msg.type === "LOGGED_OUT") {
      // Another tab logged out — clear without broadcasting again
      useAuthStore.getState().clearAuth();
    }
  };

  return () => {
    broadcastChannel?.close();
    broadcastChannel = null;
  };
}

export function isAccessTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
}

export function isAccessTokenExpiringSoon(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - ACCESS_TOKEN_EXPIRY_BUFFER_MS;
}

export async function getValidAccessToken(): Promise<string> {
  const { accessToken, accessTokenExpiresAt, refreshToken } = useAuthStore.getState();

  if (accessToken && !isAccessTokenExpiringSoon(accessTokenExpiresAt)) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  return refreshAccessToken();
}

export function refreshAccessToken(): Promise<string> {
  if (!activeRefreshPromise) {
    activeRefreshPromise = doRefresh().finally(() => {
      activeRefreshPromise = null;
    });
  }
  return activeRefreshPromise;
}

async function doRefresh(): Promise<string> {
  const { refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    performLogout();
    throw new Error("No refresh token");
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${REFRESH_ENDPOINT}`, {
      method: "PUT",
      headers: { "refresh-token": refreshToken },
    });
  } catch {
    throw new Error("Network error during token refresh");
  }

  if (res.status === 401 || res.status === 403) {
    // Another tab may have already refreshed the token — wait briefly for BroadcastChannel
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    const { accessToken, accessTokenExpiresAt } = useAuthStore.getState();
    if (accessToken && !isAccessTokenExpired(accessTokenExpiresAt)) {
      return accessToken;
    }
    performLogout();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    performLogout();
    throw new Error(`Token refresh failed with status ${res.status}`);
  }

  type RefreshResponseBody = {
    success: boolean;
    data: { accessToken: string; accessTokenExpiresAt: string | number; refreshToken: string };
  };
  const body = await res.json() as RefreshResponseBody;

  if (!body.success || !body.data) {
    performLogout();
    throw new Error("Invalid refresh response");
  }

  const { accessToken: newAccessToken, accessTokenExpiresAt: rawExpiry, refreshToken: newRefreshToken } = body.data;
  const expiresAt = normalizeExpiresAt(rawExpiry);

  useAuthStore.getState().setAccessToken(newAccessToken, expiresAt);
  useAuthStore.getState().setRefreshToken(newRefreshToken);

  broadcastChannel?.postMessage({
    type: "TOKEN_REFRESHED",
    accessToken: newAccessToken,
    accessTokenExpiresAt: expiresAt,
  } satisfies AuthBroadcastEvent);

  broadcastChannel?.postMessage({
    type: "REFRESH_TOKEN_ROTATED",
    refreshToken: newRefreshToken,
  } satisfies AuthBroadcastEvent);

  return newAccessToken;
}

export function performLogout(): void {
  activeRefreshPromise = null;
  useAuthStore.getState().clearAuth();
  broadcastChannel?.postMessage({ type: "LOGGED_OUT" } satisfies AuthBroadcastEvent);
}
