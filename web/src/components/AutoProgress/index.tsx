import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { LogApiClient } from "../../integrations/logApiClient";
import {
  autoProgressEnabledAtom,
  autoProgressPausedAtom,
  lastLogApiDiagnosticAtom,
  logApiConnectionStateAtom,
} from "../../state/auto-progress";
import { advanceRouteForAreaAtom } from "../../state/route";

export function useAutoProgress() {
  const enabled = useAtomValue(autoProgressEnabledAtom);
  const paused = useAtomValue(autoProgressPausedAtom);
  const pausedRef = useRef(paused);
  const advanceRoute = useSetAtom(advanceRouteForAreaAtom);
  const setConnectionState = useSetAtom(logApiConnectionStateAtom);
  const setLastDiagnostic = useSetAtom(lastLogApiDiagnosticAtom);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!enabled) {
      setConnectionState({ status: "disabled" });
      return;
    }

    const client = new LogApiClient({
      onConnectionState: setConnectionState,
      onDiagnostic: setLastDiagnostic,
      onAreaEntered(event) {
        if (!pausedRef.current) {
          advanceRoute(event.areaId);
        }
      },
    });
    client.start();

    return () => client.stop();
  }, [advanceRoute, enabled, setConnectionState, setLastDiagnostic]);
}
