import { parseLogApiMessage, type AreaEnteredEvent } from "./logApiProtocol.ts";

export const LOG_API_URL = "ws://127.0.0.1:6754";
export const INITIAL_RECONNECT_DELAY_MS = 1_000;
export const MAX_RECONNECT_DELAY_MS = 30_000;

export type LogApiConnectionState =
  | { status: "disabled" }
  | { status: "connecting" }
  | { status: "connected" }
  | { status: "reconnecting"; attempt: number; retryInMs: number };

export type LogApiDiagnostic =
  | {
      kind: "area-entered";
      receivedAt: string;
      areaId: string;
      areaLevel: number;
    }
  | {
      kind: "unrecognised";
      receivedAt: string;
    };

export interface LogApiSocket {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
}

export interface LogApiClientOptions {
  url?: string;
  onConnectionState(state: LogApiConnectionState): void;
  onAreaEntered(event: AreaEnteredEvent): void;
  onDiagnostic(diagnostic: LogApiDiagnostic): void;
  createSocket?: (url: string) => LogApiSocket;
  setTimer?: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
  now?: () => Date;
}

export function reconnectDelay(attempt: number): number {
  const exponent = Math.max(0, Math.floor(attempt));
  return Math.min(
    INITIAL_RECONNECT_DELAY_MS * 2 ** exponent,
    MAX_RECONNECT_DELAY_MS,
  );
}

export class LogApiClient {
  private readonly url;
  private readonly onConnectionState;
  private readonly onAreaEntered;
  private readonly onDiagnostic;
  private readonly createSocket;
  private readonly setTimer;
  private readonly clearTimer;
  private readonly now;

  private running = false;
  private retryAttempt = 0;
  private socket: LogApiSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: LogApiClientOptions) {
    this.url = options.url ?? LOG_API_URL;
    this.onConnectionState = options.onConnectionState;
    this.onAreaEntered = options.onAreaEntered;
    this.onDiagnostic = options.onDiagnostic;
    this.createSocket =
      options.createSocket ??
      ((url) => new WebSocket(url) as unknown as LogApiSocket);
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
    this.now = options.now ?? (() => new Date());
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.retryAttempt = 0;
    this.connect();
  }

  stop() {
    this.running = false;
    this.retryAttempt = 0;

    if (this.reconnectTimer !== null) {
      this.clearTimer(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.onConnectionState({ status: "disabled" });
  }

  private connect() {
    if (!this.running) {
      return;
    }

    this.onConnectionState(
      this.retryAttempt === 0
        ? { status: "connecting" }
        : {
            status: "reconnecting",
            attempt: this.retryAttempt,
            retryInMs: 0,
          },
    );

    let socket: LogApiSocket;
    try {
      socket = this.createSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket || !this.running) {
        return;
      }
      this.retryAttempt = 0;
      this.onConnectionState({ status: "connected" });
    };
    socket.onmessage = ({ data }) => {
      if (this.socket !== socket || !this.running) {
        return;
      }

      const event = parseLogApiMessage(data);
      if (event === null) {
        this.onDiagnostic({
          kind: "unrecognised",
          receivedAt: this.now().toISOString(),
        });
        return;
      }

      this.onDiagnostic({
        kind: "area-entered",
        receivedAt: this.now().toISOString(),
        areaId: event.areaId,
        areaLevel: event.areaLevel,
      });
      this.onAreaEntered(event);
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (!this.running || this.reconnectTimer !== null) {
      return;
    }

    const delay = reconnectDelay(this.retryAttempt);
    this.retryAttempt += 1;
    this.onConnectionState({
      status: "reconnecting",
      attempt: this.retryAttempt,
      retryInMs: delay,
    });
    this.reconnectTimer = this.setTimer(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
