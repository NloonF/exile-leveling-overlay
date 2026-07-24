import { persistentAtom } from "../state";

export interface OverlayHotkeys {
  toggleOverlay: string;
  holdForDetails: string;
  toggleTree: string;
}

export const DEFAULT_OVERLAY_HOTKEYS: OverlayHotkeys = {
  toggleOverlay: "Ctrl+Shift+O",
  holdForDetails: "Ctrl+Shift+D",
  toggleTree: "Ctrl+Shift+T",
};

export const overlayHotkeysAtom = persistentAtom(
  "overlay-hotkeys",
  DEFAULT_OVERLAY_HOTKEYS,
  1,
);
