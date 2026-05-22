import { getValidAccessToken, refreshAccessToken, performLogout } from "@/auth/tokenManager";
import { useAuthStore } from "@/auth/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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
  _retried?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { _retried, headers: extraHeaders, ...fetchOptions } = options;

  let token: string | null = null;
  try {
    token = await getValidAccessToken();
  } catch {
    // No active session — proceed unauthenticated (e.g., login endpoints)
  }

  const isFormData = fetchOptions.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (res.status === 401 && !_retried) {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      throw new ApiError(401, "Unauthorized");
    }

    let newToken: string;
    try {
      newToken = await refreshAccessToken();
    } catch {
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
  const body = (await res.json().catch(() => null)) as ApiBody | null;

  if (!res.ok || body?.success === false) {
    const message = body?.error?.message ?? body?.message ?? "Something went wrong";
    throw new ApiError(res.status, message);
  }

  return body?.data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
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
