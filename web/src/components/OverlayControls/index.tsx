import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import {
  configureOverlayHotkeys,
  type HotkeyRegistrationStatus,
} from "../../desktop/hotkeyClient";
import {
  OVERLAY_HOTKEY_OPTIONS,
  overlayHotkeysAtom,
} from "../../overlay/overlayHotkeys";
import { overlayPreferencesAtom } from "../../overlay/overlayPreferences";
import styles from "./styles.module.css";

interface PoeWindowStatus {
  state: "notFound" | "background" | "foreground";
  processName: string | null;
  clientRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

interface OverlayRuntimeStatus {
  visible: boolean;
  editing: boolean;
}

function invokeDesktop(command: string, args?: Record<string, unknown>) {
  if (!("__TAURI_INTERNALS__" in window)) {
    return;
  }
  void import("@tauri-apps/api/core").then(({ invoke }) =>
    invoke(command, args),
  );
}

export function OverlayControls() {
  const [preferences, setPreferences] = useAtom(overlayPreferencesAtom);
  const [hotkeys, setHotkeys] = useAtom(overlayHotkeysAtom);
  const [hotkeyStatus, setHotkeyStatus] =
    useState<HotkeyRegistrationStatus | null>(null);
  const [poeStatus, setPoeStatus] = useState<PoeWindowStatus | null>(null);
  const [overlayStatus, setOverlayStatus] = useState<OverlayRuntimeStatus>({
    visible: true,
    editing: false,
  });
  const [positionListenerReady, setPositionListenerReady] = useState(false);

  useEffect(() => {
    if (preferences.scale > 1) {
      setPreferences((current) => ({ ...current, scale: 1 }));
    }
  }, [preferences.scale, setPreferences]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let cancelled = false;
    let stopListening: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const unlisten = await listen<{
        positionX: number;
        positionY: number;
        coordinateMode: "screen" | "game";
      }>("overlay-position-changed", (event) => {
        setPreferences((current) => ({
          ...current,
          positionX: event.payload.positionX,
          positionY: event.payload.positionY,
          coordinateMode: event.payload.coordinateMode,
        }));
      });
      if (cancelled) {
        unlisten();
      } else {
        stopListening = unlisten;
        setPositionListenerReady(true);
      }
    });

    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, [setPreferences]);

  useEffect(() => {
    if (positionListenerReady) {
      invokeDesktop("apply_overlay_preferences", { preferences });
    }
  }, [positionListenerReady, preferences]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let cancelled = false;
    let stopListening: (() => void) | undefined;
    void Promise.all([
      import("@tauri-apps/api/core"),
      import("@tauri-apps/api/event"),
    ]).then(async ([{ invoke }, { listen }]) => {
      const unlisten = await listen<PoeWindowStatus>(
        "poe-window-status",
        (event) => setPoeStatus(event.payload),
      );
      const current = await invoke<PoeWindowStatus>("get_poe_window_status");
      if (cancelled) {
        unlisten();
      } else {
        stopListening = unlisten;
        setPoeStatus(current);
      }
    });

    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, []);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let cancelled = false;
    let stopListening: (() => void) | undefined;
    void Promise.all([
      import("@tauri-apps/api/core"),
      import("@tauri-apps/api/event"),
    ]).then(async ([{ invoke }, { listen }]) => {
      const unlisten = await listen<OverlayRuntimeStatus>(
        "overlay-runtime-status",
        (event) => setOverlayStatus(event.payload),
      );
      const current = await invoke<OverlayRuntimeStatus>(
        "get_overlay_runtime_status",
      );
      if (cancelled) {
        unlisten();
      } else {
        stopListening = unlisten;
        setOverlayStatus(current);
      }
    });

    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, []);

  useEffect(() => {
    let current = true;
    setHotkeyStatus(null);
    void configureOverlayHotkeys(hotkeys).then((status) => {
      if (current && status.state !== "superseded") {
        setHotkeyStatus(status);
      }
    });
    return () => {
      current = false;
    };
  }, [hotkeys]);

  return (
    <details className={styles.panel}>
      <summary>Overlay settings</summary>
      <div className={styles.content} aria-label="Overlay controls">
        <div className={styles.actions}>
          <button
            type="button"
            data-active={overlayStatus.visible}
            aria-pressed={overlayStatus.visible}
            onClick={() =>
              invokeDesktop(
                overlayStatus.visible ? "hide_overlay" : "show_overlay",
              )
            }
          >
            {overlayStatus.visible ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            data-active={overlayStatus.editing}
            aria-pressed={overlayStatus.editing}
            onClick={() => invokeDesktop("toggle_overlay_edit_mode")}
          >
            Edit layout
          </button>
          <button
            type="button"
            onClick={() => invokeDesktop("reset_overlay_position")}
          >
            Reset position
          </button>
        </div>

        <label>
          Scale
          <input
            type="range"
            min="0.75"
            max="1"
            step="0.05"
            value={Math.min(preferences.scale, 1)}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                scale: Number(event.target.value),
              }))
            }
          />
          <output>{Math.round(Math.min(preferences.scale, 1) * 100)}%</output>
        </label>

        <label>
          Opacity
          <input
            type="range"
            min="0.35"
            max="1"
            step="0.05"
            value={preferences.opacity}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                opacity: Number(event.target.value),
              }))
            }
          />
          <output>{Math.round(preferences.opacity * 100)}%</output>
        </label>

        <label>
          <input
            type="checkbox"
            checked={preferences.autoHideWhenGameInactive}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                autoHideWhenGameInactive: event.target.checked,
              }))
            }
          />
          Auto-hide outside PoE
        </label>

        <span
          className={styles.poeStatus}
          data-state={poeStatus?.state ?? "checking"}
          role="status"
        >
          {poeStatus === null && "Looking for Path of Exile…"}
          {poeStatus?.state === "notFound" &&
            "PoE not found — manual placement"}
          {poeStatus?.state === "foreground" &&
            `Attached to ${poeStatus.processName ?? "Path of Exile"}`}
          {poeStatus?.state === "background" &&
            `PoE in background${
              preferences.autoHideWhenGameInactive
                ? " — overlay auto-hidden"
                : ""
            }`}
        </span>

        <label>
          Toggle shortcut
          <select
            value={hotkeys.toggleOverlay}
            onChange={(event) =>
              setHotkeys((current) => ({
                ...current,
                toggleOverlay: event.target.value,
              }))
            }
          >
            {OVERLAY_HOTKEY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Hold to highlight
          <select
            value={hotkeys.holdForDetails}
            onChange={(event) =>
              setHotkeys((current) => ({
                ...current,
                holdForDetails: event.target.value,
              }))
            }
          >
            {OVERLAY_HOTKEY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <span
          className={styles.hotkeyStatus}
          data-state={hotkeyStatus?.state ?? "registering"}
          role="status"
        >
          {hotkeyStatus?.message ?? "Registering global shortcuts…"}
        </span>
      </div>
    </details>
  );
}
