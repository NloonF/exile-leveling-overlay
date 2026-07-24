import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FaRegPlayCircle } from "react-icons/fa";
import { OverlayInstructionView } from "./OverlayInstructionView";
import type { OverlaySnapshot } from "./overlaySnapshot";
import styles from "./OverlayView.module.css";

const statusLabels = {
  inactive: "Auto-progress off",
  active: "Connected",
  paused: "Auto-progress paused",
  disconnected: "Waiting for PoE to launch",
  complete: "Guide complete",
} as const;

export function OverlayView() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [contentScale, setContentScale] = useState(1);
  const cardRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    const card = cardRef.current;
    const content = contentRef.current;
    if (card === null || content === null) return;

    let animationFrame = 0;
    const fitContent = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const cardStyle = getComputedStyle(card);
        const availableWidth =
          card.clientWidth -
          parseFloat(cardStyle.paddingLeft) -
          parseFloat(cardStyle.paddingRight);
        const availableHeight =
          card.clientHeight -
          parseFloat(cardStyle.paddingTop) -
          parseFloat(cardStyle.paddingBottom);
        const naturalWidth = content.scrollWidth;
        const naturalHeight = content.scrollHeight;

        if (
          availableWidth <= 0 ||
          availableHeight <= 0 ||
          naturalWidth <= 0 ||
          naturalHeight <= 0
        ) {
          return;
        }

        const widthScale = availableWidth / naturalWidth;
        const heightScale = availableHeight / naturalHeight;
        const nextScale = Math.min(1, widthScale, heightScale);
        const fittedScale = nextScale > 0.98 ? 1 : nextScale * 0.985;
        setContentScale((current) =>
          Math.abs(current - fittedScale) < 0.002 ? current : fittedScale,
        );
      });
    };

    const observer = new ResizeObserver(fitContent);
    observer.observe(card);
    observer.observe(content);
    fitContent();
    window.addEventListener("resize", fitContent);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("resize", fitContent);
    };
  }, [snapshot, editing, showDetails]);

  if (snapshot === null) {
    return <div className={styles.loading}>Preparing guide…</div>;
  }

  const { preferences } = snapshot;
  return (
    <main
      className={styles.overlayRoot}
      data-editing={editing}
      data-detail={showDetails}
      style={{
        opacity: preferences.opacity,
        transform: `scale(${Math.min(preferences.scale, 1)})`,
      }}
    >
      <article ref={cardRef} className={styles.card}>
        <div
          ref={contentRef}
          className={styles.fitContent}
          style={{ transform: `scale(${contentScale})` }}
        >
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
          <div className={styles.primaryRow}>
            {showDetails && snapshot.status !== "complete" && (
              <button
                type="button"
                className={styles.completeStep}
                title="Complete this step and pause auto-progress"
                aria-label="Complete this step and pause auto-progress"
                onClick={() => {
                  void import("@tauri-apps/api/core").then(({ invoke }) =>
                    invoke("request_overlay_step_completion", {
                      edgeIndex: snapshot.progress.current,
                    }),
                  );
                }}
              >
                <FaRegPlayCircle aria-hidden />
              </button>
            )}
            <div className={styles.primary}>
              <OverlayInstructionView
                instruction={snapshot.primaryInstruction}
              />
            </div>
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
        </div>
        {editing && (
          <>
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
            <div
              className={styles.resizeHandle}
              title="Drag to resize"
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                void import("@tauri-apps/api/window").then(
                  ({ getCurrentWindow }) =>
                    getCurrentWindow().startResizeDragging("SouthEast"),
                );
              }}
            />
          </>
        )}
      </article>
    </main>
  );
}
