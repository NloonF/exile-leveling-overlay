import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { WebSocket, WebSocketServer } from "ws";
import {
  LogApiClient,
  type LogApiConnectionState,
  type LogApiSocket,
} from "../web/src/integrations/logApiClient.ts";
import type { AreaEnteredEvent } from "../web/src/integrations/logApiProtocol.ts";

test("receives a typed fixture through a real local WebSocket", async () => {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address();
  assert.notEqual(typeof address, "string");
  assert.notEqual(address, null);
  if (address === null || typeof address === "string") {
    throw new Error("Expected an assigned TCP address");
  }

  const eventReceived = Promise.withResolvers<AreaEnteredEvent>();
  const connected = Promise.withResolvers<void>();
  const states: LogApiConnectionState[] = [];
  const client = new LogApiClient({
    url: `ws://127.0.0.1:${address.port}`,
    createSocket: (url) => new WebSocket(url) as unknown as LogApiSocket,
    onConnectionState(state) {
      states.push(state);
      if (state.status === "connected") {
        connected.resolve();
      }
    },
    onAreaEntered: eventReceived.resolve,
    onDiagnostic: () => {},
  });

  const serverConnection = once(server, "connection");
  client.start();
  const [peer] = await serverConnection;
  await connected.promise;
  peer.send('Generating level 2 area "1_1_2"');

  assert.deepEqual(await eventReceived.promise, {
    type: "area-entered",
    areaId: "1_1_2",
    areaLevel: 2,
  });
  assert.deepEqual(states.slice(0, 2), [
    { status: "connecting" },
    { status: "connected" },
  ]);

  client.stop();
  peer.terminate();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});
