import { useAtom, useAtomValue } from "jotai";
import { Suspense } from "react";
import {
  autoProgressEnabledAtom,
  autoProgressPausedAtom,
  lastLogApiDiagnosticAtom,
  logApiConnectionStateAtom,
} from "../../state/auto-progress";
import { overlaySnapshotAtom } from "../../state/overlay-snapshot";
import { nextExpectedAreaIdAtom } from "../../state/route";
import styles from "./styles.module.css";

const statusLabels = {
  disabled: "Disabled",
  connecting: "Waiting for log helper",
  connected: "Connected",
  reconnecting: "Disconnected — retry scheduled",
} as const;

export function AutoProgressPanel() {
  const [enabled, setEnabled] = useAtom(autoProgressEnabledAtom);
  const [paused, setPaused] = useAtom(autoProgressPausedAtom);
  const connection = useAtomValue(logApiConnectionStateAtom);
  const diagnostic = useAtomValue(lastLogApiDiagnosticAtom);
  const nextExpectedAreaId = useAtomValue(nextExpectedAreaIdAtom);

  const diagnosticText =
    diagnostic === null
      ? "No helper event received in this session"
      : diagnostic.kind === "area-entered"
        ? `Area ${diagnostic.areaId} (level ${diagnostic.areaLevel})`
        : "Helper message not recognised";

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

      <dl className={styles.diagnostics}>
        <div>
          <dt>Status</dt>
          <dd>
            {paused && enabled
              ? "Paused — events will not advance"
              : statusLabels[connection.status]}
            {connection.status === "reconnecting" &&
              ` (attempt ${connection.attempt}, ${connection.retryInMs / 1_000}s)`}
          </dd>
        </div>
        <div>
          <dt>Endpoint</dt>
          <dd>ws://127.0.0.1:6754</dd>
        </div>
        <div>
          <dt>Expected next area</dt>
          <dd>{nextExpectedAreaId ?? "Guide complete"}</dd>
        </div>
        <div>
          <dt>Last event</dt>
          <dd>{diagnosticText}</dd>
        </div>
        {diagnostic !== null && (
          <div>
            <dt>Received</dt>
            <dd>
              <time dateTime={diagnostic.receivedAt}>
                {new Date(diagnostic.receivedAt).toLocaleTimeString()}
              </time>
            </dd>
          </div>
        )}
      </dl>

      <details className={styles.snapshot}>
        <summary>Overlay snapshot preview</summary>
        <Suspense
          fallback={
            <div className={styles.snapshotCard}>Preparing snapshot…</div>
          }
        >
          <OverlaySnapshotPreview />
        </Suspense>
      </details>
    </section>
  );
}

function OverlaySnapshotPreview() {
  const overlaySnapshot = useAtomValue(overlaySnapshotAtom);

  return (
    <div className={styles.snapshotCard}>
      <strong>
        {overlaySnapshot.sectionTitle ?? "Guide"} ·{" "}
        {overlaySnapshot.areaName ?? overlaySnapshot.status}
      </strong>
      <span>{overlaySnapshot.primaryInstruction.text}</span>
      {overlaySnapshot.secondaryInstructions.map((instruction, index) => (
        <span key={`${index}-${instruction.text}`}>• {instruction.text}</span>
      ))}
      <small>
        {overlaySnapshot.status} · Step {overlaySnapshot.progress.current} /{" "}
        {overlaySnapshot.progress.total}
      </small>
    </div>
  );
}
