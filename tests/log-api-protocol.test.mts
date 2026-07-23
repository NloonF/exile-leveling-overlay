import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  parseLogApiMessage,
  type AreaEnteredEvent,
} from "../web/src/integrations/logApiProtocol.ts";

const fixture = (name: string) =>
  readFile(new URL(`./fixtures/log-api/${name}`, import.meta.url), "utf8");

test("parses an area transition frame", async () => {
  assert.deepEqual(parseLogApiMessage(await fixture("area-transition.txt")), {
    type: "area-entered",
    areaId: "1_1_2",
    areaLevel: 2,
  } satisfies AreaEnteredEvent);
});

test("normalises unknown areas without deciding route progression", async () => {
  assert.deepEqual(parseLogApiMessage(await fixture("unknown-area.txt")), {
    type: "area-entered",
    areaId: "SanctumSecretRoom",
    areaLevel: 83,
  } satisfies AreaEnteredEvent);
});

test("ignores lifecycle messages", async () => {
  for (const name of [
    "startup.txt",
    "client-connected.txt",
    "helper-restart.txt",
    "client-restart.txt",
  ]) {
    assert.equal(parseLogApiMessage(await fixture(name)), null);
  }
});

test("rejects malformed and non-text messages", async () => {
  for (const line of (await fixture("malformed.txt")).split(/\r?\n/)) {
    assert.equal(parseLogApiMessage(line), null);
  }
  assert.equal(parseLogApiMessage(new Uint8Array([1, 2, 3])), null);
  assert.equal(parseLogApiMessage(null), null);
});
