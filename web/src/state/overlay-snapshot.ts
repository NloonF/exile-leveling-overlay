import { atom } from "jotai";
import { Data } from "common";
import { buildOverlaySnapshot } from "../overlay/overlaySnapshot";
import { overlayPreferencesAtom } from "../overlay/overlayPreferences";
import {
  autoProgressEnabledAtom,
  autoProgressPausedAtom,
  logApiConnectionStateAtom,
} from "./auto-progress";
import { activeEdgeAtom, routeSelector } from "./route";
import { urlTreesSelector } from "./tree/url-tree";

export const overlaySnapshotAtom = atom(async (get) =>
  buildOverlaySnapshot({
    route: await get(routeSelector),
    activeEdgeIndex: get(activeEdgeAtom)[0],
    autoProgressEnabled: get(autoProgressEnabledAtom),
    paused: get(autoProgressPausedAtom),
    connectionState: get(logApiConnectionStateAtom),
    areas: Data.Areas,
    quests: Data.Quests,
    gems: Data.Gems,
    trees: await get(urlTreesSelector),
    preferences: get(overlayPreferencesAtom),
  }),
);
