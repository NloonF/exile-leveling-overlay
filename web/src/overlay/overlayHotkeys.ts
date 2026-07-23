import { persistentAtom } from "../state";

export interface OverlayHotkeys {
  toggleOverlay: string;
  holdForDetails: string;
}

export const DEFAULT_OVERLAY_HOTKEYS: OverlayHotkeys = {
  toggleOverlay: "Ctrl+Shift+O",
  holdForDetails: "Ctrl+Shift+D",
};

export const OVERLAY_HOTKEY_OPTIONS = [
  { value: "", label: "Disabled" },
  { value: "Ctrl+Shift+O", label: "Ctrl + Shift + O" },
  { value: "Ctrl+Shift+D", label: "Ctrl + Shift + D" },
  { value: "Ctrl+Alt+O", label: "Ctrl + Alt + O" },
  { value: "Ctrl+Alt+D", label: "Ctrl + Alt + D" },
  { value: "Alt+Shift+O", label: "Alt + Shift + O" },
  { value: "Alt+Shift+D", label: "Alt + Shift + D" },
] as const;

export const overlayHotkeysAtom = persistentAtom(
  "overlay-hotkeys",
  DEFAULT_OVERLAY_HOTKEYS,
  0,
);
