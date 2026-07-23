import { atom } from "jotai";
import {
  type LogApiConnectionState,
  type LogApiDiagnostic,
} from "../integrations/logApiClient";
import { persistentAtom } from ".";

const AUTO_PROGRESS_ENABLED_VERSION = 0;

export const autoProgressEnabledAtom = persistentAtom(
  "auto-progress-enabled",
  false,
  AUTO_PROGRESS_ENABLED_VERSION,
);
export const autoProgressPausedAtom = atom(false);
export const logApiConnectionStateAtom = atom<LogApiConnectionState>({
  status: "disabled",
});
export const lastLogApiDiagnosticAtom = atom<LogApiDiagnostic | null>(null);
