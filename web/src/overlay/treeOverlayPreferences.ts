import { persistentAtom } from "../state";

export interface TreeOverlayPreferences {
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  opacity: number;
  coordinateMode?: "screen" | "game";
  autoHideWhenGameInactive: boolean;
}

export const DEFAULT_TREE_OVERLAY_PREFERENCES: TreeOverlayPreferences = {
  positionX: 500,
  positionY: 80,
  width: 680,
  height: 470,
  opacity: 0.92,
  coordinateMode: "game",
  autoHideWhenGameInactive: true,
};

export const treeOverlayPreferencesAtom = persistentAtom(
  "tree-overlay-preferences",
  DEFAULT_TREE_OVERLAY_PREFERENCES,
  2,
);
