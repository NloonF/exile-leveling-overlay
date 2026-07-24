import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import type { AreaEnteredEvent } from "../../integrations/areaEvents";
import {
  autoProgressEnabledAtom,
  autoProgressPausedAtom,
  logApiConnectionStateAtom,
  logReaderStatusAtom,
  type LogReaderStatus,
} from "../../state/auto-progress";
import { advanceRouteForAreaAtom } from "../../state/route";

export function useAutoProgress() {
  const enabled = useAtomValue(autoProgressEnabledAtom);
  const paused = useAtomValue(autoProgressPausedAtom);
  const pausedRef = useRef(paused);
  const advanceRoute = useSetAtom(advanceRouteForAreaAtom);
  const setConnectionState = useSetAtom(logApiConnectionStateAtom);
  const setReaderStatus = useSetAtom(logReaderStatusAtom);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      setConnectionState({ status: "disabled" });
      return;
    }

    let cancelled = false;
    const unlisteners: (() => void)[] = [];
    const applyStatus = (status: LogReaderStatus) => {
      setReaderStatus(status);
      setConnectionState(
        status.state === "disabled"
          ? { status: "disabled" }
          : status.state === "following"
            ? { status: "connected" }
            : { status: "connecting" },
      );
    };

    void Promise.all([
      import("@tauri-apps/api/core"),
      import("@tauri-apps/api/event"),
    ]).then(async ([{ invoke }, { listen }]) => {
      const stopAreas = await listen<AreaEnteredEvent>(
        "poe-area-entered",
        ({ payload }) => {
          if (!pausedRef.current) {
            advanceRoute(payload.areaId);
          }
        },
      );
      const stopStatus = await listen<LogReaderStatus>(
        "log-reader-status",
        ({ payload }) => applyStatus(payload),
      );
      if (cancelled) {
        stopAreas();
        stopStatus();
        return;
      }
      unlisteners.push(stopAreas, stopStatus);
      await invoke("set_log_reader_enabled", { enabled });
      const status = await invoke<LogReaderStatus>("get_log_reader_status");
      if (!cancelled) {
        applyStatus(status);
      }
    });

    if (!enabled) {
      setConnectionState({ status: "disabled" });
      setReaderStatus({
        state: "disabled",
        message: null,
        logPath: null,
        usingManualPath: false,
      });
    }

    return () => {
      cancelled = true;
      for (const unlisten of unlisteners) {
        unlisten();
      }
      void import("@tauri-apps/api/core").then(({ invoke }) =>
        invoke("set_log_reader_enabled", { enabled: false }),
      );
    };
  }, [advanceRoute, enabled, setConnectionState, setReaderStatus]);
}
