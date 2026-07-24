import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { OverlayInstructionView } from "./OverlayInstructionView";
import type { OverlaySnapshot } from "./overlaySnapshot";
import styles from "./OverlayView.module.css";

const statusLabels = {
  inactive: "Auto-progress off",
  active: "Connected",
  paused: "Auto-progress paused",
  disconnected: "Waiting for log reader",
  complete: "Guide complete",
} as const;

export function OverlayView() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    const unlisteners: UnlistenFn[] = [];

    void Promise.all([
      import("@tauri-apps/api/core"),
      import("@tauri-apps/api/event"),
    ]).then(async ([{ invoke }, { listen }]) => {
      const stopSnapshots = await listen<OverlaySnapshot>(
        "overlay-snapshot",
        (event) => setSnapshot(event.payload),
      );
      const stopEditMode = await listen<boolean>("overlay-edit-mode", (event) =>
        setEditing(event.payload),
      );
      const stopDetailMode = await listen<boolean>(
        "overlay-detail-mode",
        (event) => setShowDetails(event.payload),
      );

      if (cancelled) {
        stopSnapshots();
        stopEditMode();
        stopDetailMode();
        return;
      }
      unlisteners.push(stopSnapshots, stopEditMode, stopDetailMode);

      const cached = await invoke<OverlaySnapshot | null>(
        "get_overlay_snapshot",
      );
      if (!cancelled && cached !== null) {
        setSnapshot(cached);
      }
    });

    return () => {
      cancelled = true;
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const finishOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      void import("@tauri-apps/api/core").then(({ invoke }) =>
        invoke("end_overlay_edit_mode"),
      );
    };
    window.addEventListener("keydown", finishOnEscape);
    return () => window.removeEventListener("keydown", finishOnEscape);
  }, [editing]);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null || snapshot === null) {
      return;
    }

    let animationFrame = 0;
    const resizeWindow = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const bounds = root.getBoundingClientRect();
        const width = Math.ceil(bounds.width + 8);
        const height = Math.ceil(bounds.height + 8);
        void import("@tauri-apps/api/core").then(({ invoke }) =>
          invoke("resize_overlay_to_content", { width, height }),
        );
      });
    };
    const observer = new ResizeObserver(resizeWindow);
    observer.observe(root);
    resizeWindow();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [snapshot, editing, showDetails]);

  if (snapshot === null) {
    return <div className={styles.loading}>Preparing guide…</div>;
  }

  const { preferences } = snapshot;
  return (
    <main
      ref={rootRef}
      className={styles.overlayRoot}
      data-editing={editing}
      data-detail={showDetails}
      style={{
        opacity: preferences.opacity,
        transform: `scale(${Math.min(preferences.scale, 1)})`,
      }}
    >
      <article className={styles.card}>
        <header
          className={editing ? styles.dragHandle : undefined}
          onMouseDown={(event) => {
            if (!editing || event.button !== 0) {
              return;
            }
            event.preventDefault();
            void import("@tauri-apps/api/core").then(({ invoke }) =>
              invoke("start_overlay_dragging"),
            );
          }}
        >
          <strong>{snapshot.sectionTitle ?? "Exile Leveling"}</strong>
          <span>{snapshot.areaName ?? statusLabels[snapshot.status]}</span>
        </header>
        {snapshot.previousCheckpoint !== null && (
          <section className={styles.previousCheckpoint}>
            <strong>
              Current checkpoint · {snapshot.previousCheckpoint.areaName}
            </strong>
            <ul>
              {snapshot.previousCheckpoint.instructions.map(
                (instruction, index) => (
                  <li key={`${index}-${instruction.text}`}>
                    <OverlayInstructionView instruction={instruction} />
                  </li>
                ),
              )}
            </ul>
          </section>
        )}
        <div className={styles.primary}>
          <OverlayInstructionView instruction={snapshot.primaryInstruction} />
        </div>
        {snapshot.secondaryInstructions.length > 0 && (
          <ul>
            {snapshot.secondaryInstructions.map((instruction, index) => (
              <li key={`${index}-${instruction.text}`}>
                <OverlayInstructionView instruction={instruction} />
              </li>
            ))}
          </ul>
        )}
        <footer>
          <span data-status={snapshot.status}>
            {statusLabels[snapshot.status]}
          </span>
          <span>
            Step {snapshot.progress.current} / {snapshot.progress.total}
          </span>
        </footer>
        {editing && (
          <button
            type="button"
            className={styles.finishEditing}
            onClick={() => {
              void import("@tauri-apps/api/core").then(({ invoke }) =>
                invoke("end_overlay_edit_mode"),
              );
            }}
          >
            Finish editing
          </button>
        )}
      </article>
    </main>
  );
}
