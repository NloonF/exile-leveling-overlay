import type { UnlistenFn } from "@tauri-apps/api/event";
import classNames from "classnames";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { SkillTreeViewer } from "../components/SkillTreeViewer";
import type { OverlaySnapshot } from "./overlaySnapshot";
import styles from "./TreeOverlayView.module.css";
import { treeOverlayPreferencesAtom } from "./treeOverlayPreferences";

export function TreeOverlayView() {
  const preferences = useAtomValue(treeOverlayPreferencesAtom);
  const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null);
  const [editing, setEditing] = useState(false);

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
      const stopEditing = await listen<boolean>(
        "tree-overlay-edit-mode",
        (event) => setEditing(event.payload),
      );
      if (cancelled) {
        stopSnapshots();
        stopEditing();
        return;
      }
      unlisteners.push(stopSnapshots, stopEditing);
      const cached = await invoke<OverlaySnapshot | null>(
        "get_overlay_snapshot",
      );
      if (!cancelled && cached !== null) setSnapshot(cached);
    });
    return () => {
      cancelled = true;
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);

  useEffect(() => {
    if (!editing) return;
    const finishOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      void import("@tauri-apps/api/core").then(({ invoke }) =>
        invoke("end_overlay_edit_mode"),
      );
    };
    window.addEventListener("keydown", finishOnEscape);
    return () => window.removeEventListener("keydown", finishOnEscape);
  }, [editing]);

  if (snapshot === null) {
    return <div className={styles.loading}>Preparing passive tree…</div>;
  }

  return (
    <main className={styles.root} style={{ opacity: preferences.opacity }}>
      <article
        className={classNames(styles.card, { [styles.editing]: editing })}
      >
        <header
          className={editing ? styles.dragHandle : undefined}
          onMouseDown={(event) => {
            if (!editing || event.button !== 0) return;
            event.preventDefault();
            void import("@tauri-apps/api/core").then(({ invoke }) =>
              invoke("start_tree_overlay_dragging"),
            );
          }}
        >
          <strong>Passive tree</strong>
          <span>
            {snapshot.trees.length} build stage
            {snapshot.trees.length === 1 ? "" : "s"}
          </span>
        </header>
        <div className={styles.viewer}>
          {snapshot.trees.length > 0 ? (
            <SkillTreeViewer urlTrees={snapshot.trees} variant="overlay" />
          ) : (
            <div className={styles.empty}>
              Import a Path of Building passive tree first.
            </div>
          )}
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
                if (event.button !== 0) return;
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
