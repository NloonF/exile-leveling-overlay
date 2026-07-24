import assert from "node:assert/strict";
import test from "node:test";
import { buildTreeStyle } from "../web/src/state/tree/svg.ts";

test("builds passive-tree styles without runtime template compilation", () => {
  const style = buildTreeStyle({
    styleId: "TreeStyle",
    backgroundColor: "transparent",
    ascendancy: "Ascendant",
    nodeColor: "gray",
    nodeActiveColor: "blue",
    nodeAddedColor: "green",
    nodeRemovedColor: "red",
    connectionColor: "gray",
    connectionActiveColor: "blue",
    connectionAddedColor: "green",
    connectionRemovedColor: "red",
    nodesActive: ["1", "2"],
    nodesAdded: [],
    nodesRemoved: ["3"],
    connectionsActive: ["1-2"],
    connectionsAdded: [],
    connectionsRemoved: [],
  });

  assert.match(style, /#TreeStyle \.ascendancy\.Ascendant/);
  assert.match(style, /:is\(#n1, #n2\)/);
  assert.match(style, /:is\(#c1-2\)/);
  assert.doesNotMatch(style, /\{\{/);
});
