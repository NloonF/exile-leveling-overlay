import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { overlaySnapshotAtom } from "../state/overlay-snapshot";

export function useOverlaySnapshotPublisher() {
  const snapshot = useAtomValue(overlaySnapshotAtom);

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
}
