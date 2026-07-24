import { useAtom, useAtomValue } from "jotai";
import { type KeyboardEvent, useEffect, useState } from "react";
import {
  configureOverlayHotkeys,
  type HotkeyRegistrationStatus,
} from "../../desktop/hotkeyClient";
import {
  type OverlayHotkeys,
  overlayHotkeysAtom,
} from "../../overlay/overlayHotkeys";
import { overlayPreferencesAtom } from "../../overlay/overlayPreferences";
import { shortcutFromKeyboardEvent } from "../../overlay/shortcutRecorder";
import { treeOverlayPreferencesAtom } from "../../overlay/treeOverlayPreferences";
import { urlTreesSelector } from "../../state/tree/url-tree";
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
  treeMode: boolean;
}

function invokeDesktop(command: string, args?: Record<string, unknown>) {
  if (!("__TAURI_INTERNALS__" in window)) {
    return;
  }
  void import("@tauri-apps/api/core").then(({ invoke }) =>
    invoke(command, args),
  );
}

interface ShortcutRecorderProps {
  label: string;
  value: string;
  recording: boolean;
  onRecordingChange: (recording: boolean) => void;
  onChange: (shortcut: string) => void;
}

function ShortcutRecorder({
  label,
  value,
  recording,
  onRecordingChange,
  onChange,
}: ShortcutRecorderProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) return;
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      onRecordingChange(false);
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      onChange("");
      onRecordingChange(false);
      return;
    }

    const shortcut = shortcutFromKeyboardEvent(event.nativeEvent);
    if (shortcut === null) return;
    onChange(shortcut);
    onRecordingChange(false);
  };

  return (
    <div className={styles.shortcutRow}>
      <span>{label}</span>
      <kbd data-recording={recording}>
        {recording
          ? "Press Ctrl, Alt, or Shift + a key"
          : value
            ? value.replaceAll("+", " + ")
            : "Disabled"}
      </kbd>
      <div className={styles.shortcutButtons}>
        <button
          type="button"
          data-recording={recording}
          onClick={() => onRecordingChange(!recording)}
          onKeyDown={handleKeyDown}
        >
          {recording ? "Cancel" : value ? "Change" : "Record"}
        </button>
        <button
          type="button"
          disabled={!value}
          onClick={() => {
            onChange("");
            onRecordingChange(false);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function OverlayControls() {
  const [preferences, setPreferences] = useAtom(overlayPreferencesAtom);
  const [treePreferences, setTreePreferences] = useAtom(
    treeOverlayPreferencesAtom,
  );
  const [hotkeys, setHotkeys] = useAtom(overlayHotkeysAtom);
  const urlTrees = useAtomValue(urlTreesSelector);
  const [hotkeyStatus, setHotkeyStatus] =
    useState<HotkeyRegistrationStatus | null>(null);
  const [poeStatus, setPoeStatus] = useState<PoeWindowStatus | null>(null);
  const [overlayStatus, setOverlayStatus] = useState<OverlayRuntimeStatus>({
    visible: true,
    editing: false,
    treeMode: false,
  });
  const [positionListenerReady, setPositionListenerReady] = useState(false);
  const [treeLayoutListenerReady, setTreeLayoutListenerReady] = useState(false);
  const [recordingShortcut, setRecordingShortcut] = useState<
    keyof OverlayHotkeys | null
  >(null);

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
      const stopPosition = await listen<{
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
      const stopSize = await listen<{
        width: number;
        height: number;
      }>("overlay-size-changed", (event) => {
        setPreferences((current) => ({
          ...current,
          width: event.payload.width,
          height: event.payload.height,
        }));
      });
      if (cancelled) {
        stopPosition();
        stopSize();
      } else {
        stopListening = () => {
          stopPosition();
          stopSize();
        };
        setPositionListenerReady(true);
      }
    });

    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, [setPreferences]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let cancelled = false;
    let stopListening: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const unlisten = await listen<{
        positionX: number;
        positionY: number;
        width: number;
        height: number;
        coordinateMode: "screen" | "game";
      }>("tree-overlay-layout-changed", (event) => {
        setTreePreferences((current) => ({
          ...current,
          ...event.payload,
        }));
      });
      if (cancelled) unlisten();
      else {
        stopListening = unlisten;
        setTreeLayoutListenerReady(true);
      }
    });
    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, [setTreePreferences]);

  useEffect(() => {
    if (positionListenerReady) {
      invokeDesktop("apply_overlay_preferences", { preferences });
    }
  }, [positionListenerReady, preferences]);

  useEffect(() => {
    if (!treeLayoutListenerReady) return;
    invokeDesktop("apply_tree_overlay_preferences", {
      preferences: {
        ...treePreferences,
        autoHideWhenGameInactive: preferences.autoHideWhenGameInactive,
      },
    });
  }, [
    preferences.autoHideWhenGameInactive,
    treeLayoutListenerReady,
    treePreferences,
  ]);

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
        <section className={styles.controlGroup} data-tone="visibility">
          <h3>Visibility &amp; layout</h3>
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
              onClick={() =>
                invokeDesktop("toggle_overlay_edit_mode", {
                  includeTree: urlTrees.length > 0,
                })
              }
            >
              Edit layout
            </button>
            <button
              type="button"
              data-active={overlayStatus.treeMode}
              aria-pressed={overlayStatus.treeMode}
              disabled={urlTrees.length === 0}
              title={
                urlTrees.length === 0
                  ? "Import a Path of Building passive tree first"
                  : undefined
              }
              onClick={() => invokeDesktop("toggle_overlay_tree_mode")}
            >
              {overlayStatus.treeMode
                ? "Hide passive tree"
                : "Show passive tree"}
            </button>
            <button
              type="button"
              onClick={() => invokeDesktop("reset_overlay_position")}
            >
              Reset position
            </button>
          </div>
        </section>

        <section className={styles.controlGroup} data-tone="steps">
          <h3>Steps overlay</h3>
          <label>
            <span>Scale</span>
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
            <span>Opacity</span>
            <input
              type="range"
              min="0.05"
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
        </section>

        <section className={styles.controlGroup} data-tone="tree">
          <h3>Passive tree overlay</h3>
          <label>
            <span>Width</span>
            <input
              type="range"
              min="420"
              max="1200"
              step="20"
              value={Math.round(treePreferences.width)}
              onChange={(event) =>
                setTreePreferences((current) => ({
                  ...current,
                  width: Number(event.target.value),
                }))
              }
            />
            <output>{Math.round(treePreferences.width)} px</output>
          </label>

          <label>
            <span>Height</span>
            <input
              type="range"
              min="300"
              max="900"
              step="20"
              value={Math.round(treePreferences.height)}
              onChange={(event) =>
                setTreePreferences((current) => ({
                  ...current,
                  height: Number(event.target.value),
                }))
              }
            />
            <output>{Math.round(treePreferences.height)} px</output>
          </label>

          <label>
            <span>Opacity</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={treePreferences.opacity}
              onChange={(event) =>
                setTreePreferences((current) => ({
                  ...current,
                  opacity: Number(event.target.value),
                }))
              }
            />
            <output>{Math.round(treePreferences.opacity * 100)}%</output>
          </label>

          {urlTrees.length === 0 && (
            <span className={styles.notice}>
              Import a Path of Building passive tree to enable tree view.
            </span>
          )}
        </section>

        <section className={styles.controlGroup} data-tone="game">
          <h3>Game behavior</h3>
          <label className={styles.toggleRow}>
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
        </section>

        <section className={styles.controlGroup} data-tone="shortcuts">
          <h3>Shortcuts</h3>
          <ShortcutRecorder
            label="Toggle overlay"
            value={hotkeys.toggleOverlay}
            recording={recordingShortcut === "toggleOverlay"}
            onRecordingChange={(recording) =>
              setRecordingShortcut(recording ? "toggleOverlay" : null)
            }
            onChange={(toggleOverlay) =>
              setHotkeys((current) => ({ ...current, toggleOverlay }))
            }
          />

          <ShortcutRecorder
            label="Hold to interact"
            value={hotkeys.holdForDetails}
            recording={recordingShortcut === "holdForDetails"}
            onRecordingChange={(recording) =>
              setRecordingShortcut(recording ? "holdForDetails" : null)
            }
            onChange={(holdForDetails) =>
              setHotkeys((current) => ({ ...current, holdForDetails }))
            }
          />

          <ShortcutRecorder
            label="Toggle tree"
            value={hotkeys.toggleTree}
            recording={recordingShortcut === "toggleTree"}
            onRecordingChange={(recording) =>
              setRecordingShortcut(recording ? "toggleTree" : null)
            }
            onChange={(toggleTree) =>
              setHotkeys((current) => ({ ...current, toggleTree }))
            }
          />

          <span
            className={styles.hotkeyStatus}
            data-state={hotkeyStatus?.state ?? "registering"}
            role="status"
          >
            {hotkeyStatus?.message ?? "Registering global shortcuts…"}
          </span>
        </section>
      </div>
    </details>
  );
}
