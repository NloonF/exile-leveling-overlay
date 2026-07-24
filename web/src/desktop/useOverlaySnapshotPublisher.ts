import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { overlaySnapshotAtom } from "../state/overlay-snapshot";
import { manuallyCompleteRouteEdgeAtom } from "../state/route";

export function useOverlaySnapshotPublisher() {
  const snapshot = useAtomValue(overlaySnapshotAtom);
  const manuallyCompleteRouteEdge = useSetAtom(manuallyCompleteRouteEdgeAtom);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    void import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("publish_overlay_snapshot", { snapshot }))
      .catch((error: unknown) => {
        console.warn("Unable to publish overlay snapshot", error);
      });
  }, [snapshot]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let cancelled = false;
    let stopListening: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const unlisten = await listen<{ edgeIndex: number }>(
        "overlay-step-completion-requested",
        (event) => {
          void manuallyCompleteRouteEdge(event.payload.edgeIndex);
        },
      );
      if (cancelled) {
        unlisten();
      } else {
        stopListening = unlisten;
      }
    });

    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, [manuallyCompleteRouteEdge]);
}
