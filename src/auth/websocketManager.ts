import { getValidAccessToken, performLogout, TransientRefreshError } from "./tokenManager";

type WsState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface WebSocketManagerOptions {
  url: string;
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  maxReconnectAttempts?: number;
  baseReconnectDelayMs?: number;
}

const AUTH_CLOSE_CODES = new Set([1008, 4001, 4003]);

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private state: WsState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isHandlingReconnect = false;
  private destroyed = false;

  private readonly maxAttempts: number;
  private readonly baseDelay: number;

  constructor(private readonly options: WebSocketManagerOptions) {
    this.maxAttempts = options.maxReconnectAttempts ?? 6;
    this.baseDelay = options.baseReconnectDelayMs ?? 1000;
  }

  async connect(): Promise<void> {
    if (this.destroyed) return;
    if (this.state === "connecting" || this.state === "connected") return;

    this.state = "connecting";

    let token: string;
    try {
      token = await getValidAccessToken();
    } catch {
      this.state = "disconnected";
      return;
    }

    // The token is never put in the URL: query strings end up in proxy and
    // server access logs. It goes in the first frame instead, and the server
    // must authenticate that frame before trusting the socket (closing with
    // 4001 otherwise, which triggers handleAuthClose below).
    this.ws = new WebSocket(this.options.url);

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ type: "auth", token }));
      this.state = "connected";
      this.reconnectAttempts = 0;
      this.isHandlingReconnect = false;
      this.options.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      this.options.onMessage?.(event);
    };

    this.ws.onerror = (event) => {
      this.options.onError?.(event);
    };

    this.ws.onclose = (event) => {
      this.options.onClose?.(event);
      this.ws = null;
      this.state = "disconnected";

      if (this.destroyed) return;

      if (AUTH_CLOSE_CODES.has(event.code)) {
        this.handleAuthClose();
      } else if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  private async handleAuthClose(): Promise<void> {
    if (this.isHandlingReconnect) return;
    this.isHandlingReconnect = true;

    try {
      await getValidAccessToken();
      this.reconnectAttempts = 0;
      await this.connect();
    } catch (err) {
      // Offline / server down isn't an auth failure — retry later instead.
      if (err instanceof TransientRefreshError) {
        this.isHandlingReconnect = false;
        this.scheduleReconnect();
        return;
      }
      performLogout();
    }
  }

  private scheduleReconnect(): void {
    if (this.isHandlingReconnect) return;
    if (this.reconnectAttempts >= this.maxAttempts) {
      this.state = "disconnected";
      return;
    }

    this.isHandlingReconnect = true;
    this.state = "reconnecting";

    const jitter = Math.random() * 500;
    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), 30_000) + jitter;
    this.reconnectAttempts++;

    this.reconnectTimeoutId = setTimeout(async () => {
      this.isHandlingReconnect = false;
      this.reconnectTimeoutId = null;
      await this.connect();
    }, delay);
  }

  disconnect(code = 1000): void {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.isHandlingReconnect = false;
    this.ws?.close(code);
    this.ws = null;
    this.state = "disconnected";
  }

  destroy(): void {
    this.destroyed = true;
    this.disconnect();
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  getState(): WsState {
    return this.state;
  }
}
