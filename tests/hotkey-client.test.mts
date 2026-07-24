import assert from "node:assert/strict";
import test from "node:test";
import { validateOverlayHotkeys } from "../web/src/desktop/hotkeyClient.ts";
import { shortcutFromKeyboardEvent } from "../web/src/overlay/shortcutRecorder.ts";

test("accepts distinct or disabled overlay shortcuts", () => {
  assert.equal(
    validateOverlayHotkeys({
      toggleOverlay: "Ctrl+Shift+O",
      holdForDetails: "Ctrl+Shift+D",
      toggleTree: "Ctrl+Shift+T",
    }),
    null,
  );
  assert.equal(
    validateOverlayHotkeys({
      toggleOverlay: "",
      holdForDetails: "Ctrl+Shift+D",
      toggleTree: "Ctrl+Shift+T",
    }),
    null,
  );
});

test("rejects assigning the same shortcut to multiple actions", () => {
  assert.equal(
    validateOverlayHotkeys({
      toggleOverlay: "Ctrl+Shift+O",
      holdForDetails: "ctrl+shift+o",
      toggleTree: "Ctrl+Shift+T",
    }),
    "Choose different shortcuts for each action",
  );
  assert.equal(
    validateOverlayHotkeys({
      toggleOverlay: "Ctrl+Shift+O",
      holdForDetails: "Ctrl+Shift+D",
      toggleTree: "ctrl+shift+d",
    }),
    "Choose different shortcuts for each action",
  );
});

test("records custom modifier shortcuts from keyboard input", () => {
  assert.equal(
    shortcutFromKeyboardEvent({
      altKey: true,
      code: "KeyP",
      ctrlKey: true,
      key: "p",
      shiftKey: false,
    }),
    "Ctrl+Alt+P",
  );
  assert.equal(
    shortcutFromKeyboardEvent({
      altKey: false,
      code: "F8",
      ctrlKey: false,
      key: "F8",
      shiftKey: true,
    }),
    "Shift+F8",
  );
});

test("does not record unmodified or unsupported shortcut keys", () => {
  assert.equal(
    shortcutFromKeyboardEvent({
      altKey: false,
      code: "KeyP",
      ctrlKey: false,
      key: "p",
      shiftKey: false,
    }),
    null,
  );
  assert.equal(
    shortcutFromKeyboardEvent({
      altKey: false,
      code: "Space",
      ctrlKey: true,
      key: " ",
      shiftKey: false,
    }),
    null,
  );
});
