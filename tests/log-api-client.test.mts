import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_RECONNECT_DELAY_MS,
  LogApiClient,
  MAX_RECONNECT_DELAY_MS,
  reconnectDelay,
  type LogApiConnectionState,
  type LogApiDiagnostic,
} from "../web/src/integrations/logApiClient.ts";
import type { AreaEnteredEvent } from "../web/src/integrations/logApiProtocol.ts";

class FakeSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  closed = false;

  close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.onclose?.();
  }
}

test("uses bounded exponential reconnect delays", () => {
  assert.equal(reconnectDelay(0), INITIAL_RECONNECT_DELAY_MS);
  assert.equal(reconnectDelay(1), 2_000);
  assert.equal(reconnectDelay(4), 16_000);
  assert.equal(reconnectDelay(5), MAX_RECONNECT_DELAY_MS);
  assert.equal(reconnectDelay(100), MAX_RECONNECT_DELAY_MS);
});

test("normalises valid frames and records only safe diagnostics", () => {
  const socket = new FakeSocket();
  const states: LogApiConnectionState[] = [];
  const events: AreaEnteredEvent[] = [];
  const diagnostics: LogApiDiagnostic[] = [];
  const client = new LogApiClient({
    createSocket: () => socket,
    onConnectionState: (state) => states.push(state),
    onAreaEntered: (event) => events.push(event),
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    now: () => new Date("2026-07-23T14:00:00.000Z"),
  });

  client.start();
  socket.onopen?.();
  socket.onmessage?.({
    data: 'Generating level 12 area "2_5_1"',
  });

  assert.deepEqual(states, [{ status: "connecting" }, { status: "connected" }]);
  assert.deepEqual(events, [
    { type: "area-entered", areaId: "2_5_1", areaLevel: 12 },
  ]);
  assert.deepEqual(diagnostics, [
    {
      kind: "area-entered",
      receivedAt: "2026-07-23T14:00:00.000Z",
      areaId: "2_5_1",
      areaLevel: 12,
    },
  ]);
});

test("schedules reconnect and recovers without recreating the client", () => {
  const sockets: FakeSocket[] = [];
  const states: LogApiConnectionState[] = [];
  let scheduled: (() => void) | null = null;
  const client = new LogApiClient({
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    setTimer: (callback) => {
      scheduled = callback;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: () => {
      scheduled = null;
    },
    onConnectionState: (state) => states.push(state),
    onAreaEntered: () => {},
    onDiagnostic: () => {},
  });

  client.start();
  sockets[0].onclose?.();

  assert.deepEqual(states.at(-1), {
    status: "reconnecting",
    attempt: 1,
    retryInMs: 1_000,
  });

  const reconnect = scheduled as (() => void) | null;
  assert.notEqual(reconnect, null);
  reconnect?.();
  assert.equal(sockets.length, 2);
  sockets[1].onopen?.();
  assert.deepEqual(states.at(-1), { status: "connected" });
});

test("stop cancels retries and reports disabled", () => {
  const socket = new FakeSocket();
  let timerCleared = false;
  const states: LogApiConnectionState[] = [];
  const client = new LogApiClient({
    createSocket: () => socket,
    setTimer: () => 1 as unknown as ReturnType<typeof setTimeout>,
    clearTimer: () => {
      timerCleared = true;
    },
    onConnectionState: (state) => states.push(state),
    onAreaEntered: () => {},
    onDiagnostic: () => {},
  });

  client.start();
  socket.onclose?.();
  client.stop();

  assert.equal(timerCleared, true);
  assert.deepEqual(states.at(-1), { status: "disabled" });
});
