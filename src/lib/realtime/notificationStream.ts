"use client";

import { useEffect, useRef } from "react";
import { API_BASE } from "@/auth/authConstants";
import { useAuthStore } from "@/auth/authStore";
import { getValidAccessToken, performLogout, refreshAccessToken, TransientRefreshError } from "@/auth/tokenManager";

const STREAM_PATH = "/user/notifications/stream";
const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 60_000;

type Listener = () => void;
const listeners = new Set<Listener>();

function emitNotificationsChanged() {
  for (const listener of listeners) listener();
}

/**
 * Calls `onChange` whenever the server says the user's notifications
 * changed, and each time the stream (re)connects — events sent while it was
 * down are not replayed, so a connect always means "refetch".
 */
export function useNotificationsChanged(onChange: () => void) {
  const ref = useRef(onChange);
  useEffect(() => {
    ref.current = onChange;
  });
  useEffect(() => {
    const listener = () => ref.current();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

/**
 * How one connection ended:
 * - "now": reconnect immediately (token expired, or a 401 that a refresh fixed)
 * - "later": reconnect after a backoff (network drop, server trouble)
 * - "stop": stay off until the page is shown again (logged out, replaced by a newer tab)
 */
type Outcome = "now" | "later" | "stop";

/**
 * Reads the Server-Sent Events stream with fetch rather than EventSource:
 * EventSource can't send the Authorization header, and the access token must
 * never go in the URL (it would land in access logs).
 */
async function connectOnce(signal: AbortSignal, onReady: () => void): Promise<Outcome> {
  let token: string;
  try {
    token = await getValidAccessToken();
  } catch (err) {
    return err instanceof TransientRefreshError ? "later" : "stop";
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${STREAM_PATH}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      cache: "no-store",
      signal,
    });
  } catch {
    return signal.aborted ? "stop" : "later";
  }

  if (res.status === 401) {
    // Expired token, or this session was signed out. A refresh tells which.
    if (!useAuthStore.getState().hasSession) return "stop";
    try {
      await refreshAccessToken();
      return "now";
    } catch (err) {
      if (err instanceof TransientRefreshError) return "later";
      performLogout();
      return "stop";
    }
  }
  if (!res.ok || !res.body) return "later";

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return "later";
      buffer += value;
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        let event = "message";
        let data = "";
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
          // Lines starting with ":" are heartbeats.
        }
        if (event === "ready") {
          onReady();
          emitNotificationsChanged();
        } else if (event === "notifications") {
          emitNotificationsChanged();
        } else if (event === "end") {
          let reason: string | undefined;
          try {
            reason = (JSON.parse(data) as { reason?: string }).reason;
          } catch {}
          // "session-ended" reconnects too: the 401 that follows logs out
          // only if this device's session is really gone.
          if (reason === "expired" || reason === "session-ended") return "now";
          if (reason === "replaced") return "stop";
          return "later";
        }
      }
    }
  } catch {
    return signal.aborted ? "stop" : "later";
  } finally {
    reader.cancel().catch(() => {});
  }
}

/**
 * Keeps one notification stream open while the page is visible, and closes
 * it while hidden (a background tab or locked phone gains nothing from it,
 * and every open stream holds a connection). Returns a stop function.
 */
export function startNotificationStream(): () => void {
  let controller: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let stopped = false;

  function close() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    controller?.abort();
    controller = null;
  }

  async function run() {
    if (stopped || controller || document.visibilityState !== "visible") return;
    const current = new AbortController();
    controller = current;
    const outcome = await connectOnce(current.signal, () => {
      attempts = 0;
    });
    if (controller !== current) return; // closed or replaced while connected
    controller = null;
    if (stopped || outcome === "stop") return;
    // A few instant retries; past that (say, a 401 that refreshing never fixes) back off.
    if (outcome === "now" && attempts < 3) {
      attempts++;
      void run();
      return;
    }
    const delay = Math.min(BASE_RETRY_MS * 2 ** attempts, MAX_RETRY_MS) + Math.random() * 1_000;
    attempts++;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void run();
    }, delay);
  }

  function handleVisibility() {
    if (document.visibilityState === "visible") {
      attempts = 0;
      void run();
    } else {
      close();
    }
  }

  function handleOnline() {
    attempts = 0;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    void run();
  }

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("online", handleOnline);
  void run();

  return () => {
    stopped = true;
    close();
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("online", handleOnline);
  };
}
