import { atom } from "jotai";

export type LogApiConnectionState =
  { status: "disabled" } | { status: "connecting" } | { status: "connected" };

export interface LogReaderStatus {
  state: "disabled" | "searching" | "following" | "error";
  message: string | null;
  logPath: string | null;
  usingManualPath: boolean;
}

export const autoProgressEnabledAtom = atom(false);
export const autoProgressPausedAtom = atom(false);
export const logApiConnectionStateAtom = atom<LogApiConnectionState>({
  status: "disabled",
});
export const logReaderStatusAtom = atom<LogReaderStatus>({
  state: "disabled",
  message: null,
  logPath: null,
  usingManualPath: false,
});
