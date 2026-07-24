import styles from "./styles.module.css";
import classNames from "classnames";
import type { ReactNode } from "react";

type SidebarTooltip = {
  title: ReactNode;
  className?: string;
} & React.PropsWithChildren;

export function SidebarTooltip({ title, className, children }: SidebarTooltip) {
  return (
    <div className={classNames(styles.tooltip, className)}>
      <div className={classNames(styles.tooltipTitle)}>{title}</div>

      {children && (
        <>
          <hr />
          {children}
        </>
      )}
    </div>
  );
}
