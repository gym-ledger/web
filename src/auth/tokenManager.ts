import { useAuthStore } from "./authStore";
import {
  ACCESS_TOKEN_EXPIRY_BUFFER_MS,
  REFRESH_ENDPOINT,
  LOGOUT_ENDPOINT,
  API_BASE,
  BROADCAST_CHANNEL_NAME,
  normalizeExpiresAt,
} from "./authConstants";
import type { AuthBroadcastEvent } from "./authTypes";

/**
 * The refresh couldn't reach a working server (offline, timeout, 5xx). The
 * session itself may be perfectly valid, so this must never log the user out.
 */
export class TransientRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientRefreshError";
  }
}

let activeRefreshPromise: Promise<string> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

export function initBroadcastChannel(): () => void {
  if (typeof window === "undefined") return () => {};

  broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

  broadcastChannel.onmessage = (event: MessageEvent<AuthBroadcastEvent>) => {
    const msg = event.data;
    if (msg.type === "TOKEN_REFRESHED") {
      useAuthStore.getState().setAccessToken(msg.accessToken, msg.accessTokenExpiresAt);
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
  const { accessToken, accessTokenExpiresAt, hasSession } = useAuthStore.getState();

  if (accessToken && !isAccessTokenExpiringSoon(accessTokenExpiresAt)) {
    return accessToken;
  }

  if (!hasSession) {
    throw new Error("No session");
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
  if (!useAuthStore.getState().hasSession) {
    performLogout();
    throw new Error("No session");
  }

  let res: Response;
  try {
    // The refresh token is the httpOnly cookie the browser attaches itself;
    // the API rotates it in the same response.
    res = await fetch(`${API_BASE}${REFRESH_ENDPOINT}`, {
      method: "PUT",
      credentials: "include",
    });
  } catch {
    throw new TransientRefreshError("Network error during token refresh");
  }

  if (res.status === 401 || res.status === 403) {
    // Another tab may have rotated the cookie first — wait briefly for its BroadcastChannel message
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    const { accessToken, accessTokenExpiresAt } = useAuthStore.getState();
    if (accessToken && !isAccessTokenExpired(accessTokenExpiresAt)) {
      return accessToken;
    }
    performLogout();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    // Server/gateway trouble (5xx, 429…), not a verdict on the refresh token.
    throw new TransientRefreshError(`Token refresh failed with status ${res.status}`);
  }

  type RefreshResponseBody = {
    success: boolean;
    data: { accessToken: string; accessTokenExpiresAt: string | number };
  };
  let body: RefreshResponseBody;
  try {
    body = await res.json() as RefreshResponseBody;
  } catch {
    // Truncated in transit on a flaky connection.
    throw new TransientRefreshError("Incomplete token refresh response");
  }

  if (!body.success || !body.data) {
    performLogout();
    throw new Error("Invalid refresh response");
  }

  const { accessToken: newAccessToken, accessTokenExpiresAt: rawExpiry } = body.data;
  const expiresAt = normalizeExpiresAt(rawExpiry);

  useAuthStore.getState().setAccessToken(newAccessToken, expiresAt);

  broadcastChannel?.postMessage({
    type: "TOKEN_REFRESHED",
    accessToken: newAccessToken,
    accessTokenExpiresAt: expiresAt,
  } satisfies AuthBroadcastEvent);

  return newAccessToken;
}

export function performLogout(): void {
  const { hasSession } = useAuthStore.getState();

  activeRefreshPromise = null;
  useAuthStore.getState().clearAuth();
  broadcastChannel?.postMessage({ type: "LOGGED_OUT" } satisfies AuthBroadcastEvent);

  // Best-effort — the local session is already cleared above regardless of
  // whether this call succeeds, so failures (offline, already-invalid token,
  // etc.) are deliberately swallowed rather than surfaced to the caller.
  // The API deletes the session and clears the httpOnly cookie.
  if (hasSession) {
    fetch(`${API_BASE}${LOGOUT_ENDPOINT}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
  }
}
