import { useAtomValue } from "jotai";
import { logApiConnectionStateAtom } from "../../state/auto-progress";
import styles from "./styles.module.css";

const labels = {
  disabled: "Auto-progress off",
  connecting: "Waiting for log helper",
  connected: "Log helper connected",
  reconnecting: "Reconnecting to log helper",
} as const;

export function HelperConnectionStatus() {
  const state = useAtomValue(logApiConnectionStateAtom);

  return (
    <span
      className={styles.badge}
      data-state={state.status}
      role="status"
      title="exile-log-api connection status"
    >
      <span className={styles.dot} aria-hidden="true" />
      {labels[state.status]}
    </span>
  );
}
