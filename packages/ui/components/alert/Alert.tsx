import classNames from "classnames";
import type { ReactNode } from "react";
import { forwardRef } from "react";
import type { IconType } from "react-icons";

import { CheckCircle2, Info, XCircle, AlertTriangle } from "@calcom/ui/components/icon";

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
  CustomIcon?: IconType;
}
export const Alert = forwardRef<HTMLDivElement, AlertProps>((props, ref) => {
  const { severity, iconClassName, CustomIcon } = props;

  return (
    <div
      ref={ref}
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
        {CustomIcon ? (
          <div className="flex-shrink-0">
            <CustomIcon aria-hidden="true" className={classNames("text-default h-5 w-5", iconClassName)} />
          </div>
        ) : (
          <div className="flex-shrink-0">
            {severity === "error" && (
              <XCircle
                className={classNames("h-5 w-5 fill-red-400 text-white", iconClassName)}
                aria-hidden="true"
              />
            )}
            {severity === "warning" && (
              <AlertTriangle
                className={classNames("h-5 w-5 fill-yellow-400 text-white", iconClassName)}
                aria-hidden="true"
              />
            )}
            {severity === "info" && (
              <Info
                className={classNames("h-5 w-5 fill-sky-400 text-white", iconClassName)}
                aria-hidden="true"
              />
            )}
            {severity === "neutral" && (
              <Info
                className={classNames("text-default h-5 w-5 fill-transparent", iconClassName)}
                aria-hidden="true"
              />
            )}
            {severity === "success" && (
              <CheckCircle2
                className={classNames("fill-muted h-5 w-5 text-white", iconClassName)}
                aria-hidden="true"
              />
            )}
          </div>
        )}

        <div className="ml-3 flex-grow">
          <h3 className="text-sm font-medium">{props.title}</h3>
          <div className="text-sm">{props.message}</div>
        </div>
        {/* @TODO: Shouldn't be absolute. This makes it harder to give margin etc. */}
        {props.actions && <div className="absolute top-1 right-1 text-sm md:relative">{props.actions}</div>}
      </div>
    </div>
  );
});

Alert.displayName = "Alert";
