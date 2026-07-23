import assert from "node:assert/strict";
import test from "node:test";
import { validateOverlayHotkeys } from "../web/src/desktop/hotkeyClient.ts";

test("accepts distinct or disabled overlay shortcuts", () => {
  assert.equal(
    validateOverlayHotkeys({
      toggleOverlay: "Ctrl+Shift+O",
      holdForDetails: "Ctrl+Shift+D",
    }),
    null,
  );
  assert.equal(
    validateOverlayHotkeys({
      toggleOverlay: "",
      holdForDetails: "Ctrl+Shift+D",
    }),
    null,
  );
});

test("rejects assigning the same shortcut to both actions", () => {
  assert.equal(
    validateOverlayHotkeys({
      toggleOverlay: "Ctrl+Shift+O",
      holdForDetails: "ctrl+shift+o",
    }),
    "Choose two different shortcuts",
  );
});
