import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import {
  autoProgressEnabledAtom,
  autoProgressPausedAtom,
  logReaderStatusAtom,
} from "../../state/auto-progress";
import styles from "./styles.module.css";

const MANUAL_LOG_PATH_KEY = "manual-latest-client-path";

export function AutoProgressPanel() {
  const [enabled, setEnabled] = useAtom(autoProgressEnabledAtom);
  const [paused, setPaused] = useAtom(autoProgressPausedAtom);
  const readerStatus = useAtomValue(logReaderStatusAtom);
  const [manualPath, setManualPath] = useState(
    () => localStorage.getItem(MANUAL_LOG_PATH_KEY) ?? "",
  );
  const [pathError, setPathError] = useState<string | null>(null);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window) || !manualPath) {
      return;
    }
    void import("@tauri-apps/api/core").then(({ invoke }) =>
      invoke("set_manual_log_path", { path: manualPath }).catch((error) =>
        setPathError(String(error)),
      ),
    );
  }, []);

  async function saveManualPath(path: string | null) {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }
    setPathError(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_manual_log_path", { path });
      if (path) {
        localStorage.setItem(MANUAL_LOG_PATH_KEY, path);
      } else {
        localStorage.removeItem(MANUAL_LOG_PATH_KEY);
        setManualPath("");
      }
    } catch (error) {
      setPathError(String(error));
    }
  }

  return (
    <section className={styles.panel} aria-label="Automatic progression">
      <div className={styles.controls}>
        <label className={styles.enable}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => {
              const nextEnabled = event.target.checked;
              setEnabled(nextEnabled);
              if (!nextEnabled) {
                setPaused(false);
              }
            }}
          />
          Enable auto-progress
        </label>
        <button
          type="button"
          className={styles.pause}
          disabled={!enabled}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "Resume auto-progress" : "Pause auto-progress"}
        </button>
      </div>
      {(readerStatus.state === "error" || pathError !== null) && (
        <div className={styles.error} role="alert">
          <strong>Automatic progression needs attention.</strong>
          <span>{pathError ?? readerStatus.message}</span>
        </div>
      )}
      <details className={styles.advanced}>
        <summary>Advanced log location</summary>
        <p>
          Leave this empty to detect the running Path of Exile 1 client
          automatically.
        </p>
        <label>
          LatestClient.txt
          <input
            type="text"
            value={manualPath}
            placeholder="C:\Path of Exile\logs\LatestClient.txt"
            onChange={(event) => setManualPath(event.target.value)}
          />
        </label>
        <div>
          <button
            type="button"
            onClick={() => {
              void import("@tauri-apps/plugin-dialog").then(
                async ({ open }) => {
                  const selected = await open({
                    multiple: false,
                    directory: false,
                    filters: [
                      { name: "Path of Exile log", extensions: ["txt"] },
                    ],
                  });
                  if (selected) {
                    setManualPath(selected);
                    await saveManualPath(selected);
                  }
                },
              );
            }}
          >
            Browse
          </button>
          <button
            type="button"
            onClick={() => void saveManualPath(manualPath.trim() || null)}
          >
            Apply location
          </button>
          <button type="button" onClick={() => void saveManualPath(null)}>
            Use automatic detection
          </button>
        </div>
      </details>
    </section>
  );
}
