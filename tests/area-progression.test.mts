import assert from "node:assert/strict";
import test from "node:test";
import { nextRouteEdgeIndex } from "../web/src/integrations/areaProgression.ts";

const edges = ["1_1_1", "1_1_2", "1_1_3"];

test("advances exactly one edge when the expected area is entered", () => {
  assert.equal(nextRouteEdgeIndex(edges, 0, "1_1_2"), 1);
});

test("does not advance for an unknown or out-of-order area", () => {
  assert.equal(nextRouteEdgeIndex(edges, 0, "UnknownArea"), null);
  assert.equal(nextRouteEdgeIndex(edges, 0, "1_1_3"), null);
});

test("does not advance again for a repeated current area", () => {
  assert.equal(nextRouteEdgeIndex(edges, 1, "1_1_2"), null);
});

test("does not advance beyond a completed route", () => {
  assert.equal(nextRouteEdgeIndex(edges, edges.length - 1, "1_1_3"), null);
});
