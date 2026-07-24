import { persistentAtom } from "../state";

export interface OverlayPreferences {
  scale: number;
  opacity: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  coordinateMode?: "screen" | "game";
  autoHideWhenGameInactive: boolean;
}

export const DEFAULT_OVERLAY_PREFERENCES: OverlayPreferences = {
  scale: 1,
  opacity: 0.92,
  positionX: 24,
  positionY: 80,
  width: 420,
  height: 240,
  coordinateMode: "game",
  autoHideWhenGameInactive: true,
};

const OVERLAY_PREFERENCES_VERSION = 2;

export const overlayPreferencesAtom = persistentAtom(
  "overlay-preferences",
  DEFAULT_OVERLAY_PREFERENCES,
  OVERLAY_PREFERENCES_VERSION,
);
