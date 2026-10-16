import { getValidAccessToken, refreshAccessToken, performLogout, TransientRefreshError } from "@/auth/tokenManager";
import { useAuthStore } from "@/auth/authStore";
import {
  currentCacheGeneration,
  readCachedApiResponse,
  writeCachedApiResponse,
} from "@/lib/offline/apiResponseCache";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// Generous enough for slow/3G-class connections, but bounded — without this a
// stalled request on a flaky connection hangs indefinitely with no feedback.
const REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  /**
   * `false` for the public auth endpoints: no bearer token is sent and a 401
   * is the server's answer (e.g. "Invalid credentials"), not an expired session.
   */
  auth?: boolean;
  _retried?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { _retried, auth = true, headers: extraHeaders, ...fetchOptions } = options;

  let token: string | null = null;
  if (auth) {
    try {
      token = await getValidAccessToken();
    } catch {
      // No active session — proceed unauthenticated (e.g., login endpoints)
    }
  }

  const isFormData = fetchOptions.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      // Lets sign-in responses set the httpOnly refresh cookie (cross-origin
      // fetches ignore Set-Cookie otherwise). The cookie is path-scoped to
      // /auth on the API, so other calls never carry it.
      credentials: "include",
      signal: fetchOptions.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new ApiError(0, "Request timed out — check your connection and try again");
    }
    throw new ApiError(0, "Network error — check your connection and try again");
  }

  if (res.status === 401 && auth && !_retried) {
    if (!useAuthStore.getState().hasSession) {
      throw new ApiError(401, "Unauthorized");
    }

    let newToken: string;
    try {
      newToken = await refreshAccessToken();
    } catch (err) {
      if (err instanceof TransientRefreshError) {
        throw new ApiError(0, "Network error — check your connection and try again");
      }
      performLogout();
      throw new ApiError(401, "Session expired");
    }

    return request<T>(path, {
      ...options,
      _retried: true,
      headers: { ...extraHeaders, Authorization: `Bearer ${newToken}` },
    });
  }

  type ApiBody = {
    success?: boolean;
    data?: T;
    error?: { message?: string };
    message?: string;
  };
  let body: ApiBody;
  try {
    body = (await res.json()) as ApiBody;
  } catch {
    // The backend always sends a JSON body (see responseSend on the API side)
    // — a parse failure here means the response was truncated/corrupted in
    // transit, not that it was legitimately empty. Treating it as `null`
    // data would silently return `undefined` as if the request succeeded.
    throw new ApiError(res.status, "Received an incomplete response — check your connection and try again");
  }

  if (!res.ok || body?.success === false) {
    const message = body?.error?.message ?? body?.message ?? "Something went wrong";
    throw new ApiError(res.status, message);
  }

  return body?.data as T;
}

/**
 * GETs remember their last good response; when the network is down (status
 * 0: offline / timeout) that copy is returned instead, so screens already
 * visited keep working at the gym with no signal. Real API errors (4xx/5xx)
 * are never masked.
 */
async function cachedGet<T>(path: string): Promise<T> {
  const cacheGeneration = currentCacheGeneration();
  try {
    const data = await request<T>(path, { method: "GET" });
    void writeCachedApiResponse(path, data, cacheGeneration);
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) {
      const cached = await readCachedApiResponse<T>(path);
      if (cached.found) return cached.data;
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string) => cachedGet<T>(path),

  post: <T>(path: string, body?: unknown, options?: Pick<RequestOptions, "auth">) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
