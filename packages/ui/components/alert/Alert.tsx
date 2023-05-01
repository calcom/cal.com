import classNames from "classnames";
import type { ReactNode } from "react";

import { CheckCircle2, AlertTriangle, Info, XCircle } from "@calcom/ui/components/icon";

export interface AlertProps {
  title?: ReactNode;
  // @TODO: Message should be children, more flexible?
  message?: ReactNode;
  // @TODO: Provide action buttons so style is always the same.
  actions?: ReactNode;
  className?: string;
  iconClassName?: string;
  // @TODO: Success and info shouldn't exist as per design?
  severity: "success" | "warning" | "error" | "info" | "neutral";
}
export function Alert(props: AlertProps) {
  const { severity, iconClassName } = props;

  return (
    <div
      className={classNames(
        "rounded-md border border-opacity-20 p-3",
        props.className,
        severity === "error" && "border-red-900 bg-red-50 text-red-800",
        severity === "warning" && "border-yellow-700 bg-yellow-50 text-yellow-700",
        severity === "info" && "border-sky-700 bg-sky-50 text-sky-700",
        severity === "success" && "bg-inverted text-inverted",
        severity === "neutral" && "bg-subtle text-default border-none"
      )}>
      <div className="relative flex flex-col md:flex-row">
        <div className="flex-shrink-0">
          {severity === "error" && (
            <XCircle
              fill="rgb(248 113 113)"
              color="white"
              className={classNames("h-5 w-5", iconClassName)}
              aria-hidden="true"
            />
          )}
          {severity === "warning" && (
            <AlertTriangle
              color="white"
              fill="rgb(250 204 21)"
              className={classNames("h-5 w-5", iconClassName)}
              aria-hidden="true"
            />
          )}
          {severity === "info" && (
            <Info
              color="white"
              fill="rgb(56 189 248)"
              className={classNames("h-5 w-5 text-sky-400", iconClassName)}
              aria-hidden="true"
            />
          )}
          {severity === "neutral" && (
            <Info className={classNames("h-5 w-5", iconClassName)} aria-hidden="true" />
          )}
          {severity === "success" && (
            <CheckCircle2
              color="white"
              fill="#9CA3AF"
              className={classNames("h-5 w-5", iconClassName)}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="ml-3 flex-grow">
          <h3 className="text-sm font-medium">{props.title}</h3>
          <div className="text-sm">{props.message}</div>
        </div>
        {/* @TODO: Shouldn't be absolute. This makes it harder to give margin etc. */}
        {props.actions && <div className="absolute top-1 right-1 text-sm md:relative">{props.actions}</div>}
      </div>
    </div>
  );
}
