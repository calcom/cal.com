import classNames from "classnames";
import type { ReactNode } from "react";
import { forwardRef } from "react";

import { Icon, type IconName } from "../..";

export interface AlertProps {
  title?: ReactNode;
  // @TODO: Message should be children, more flexible?
  message?: ReactNode;
  // @TODO: Provide action buttons so style is always the same.
  actions?: ReactNode;
  className?: string;
  iconClassName?: string;
  // @TODO: Success and info shouldn't exist as per design?
  severity: "success" | "warning" | "error" | "info" | "neutral" | "green";
  CustomIcon?: IconName;
  customIconColor?: string;
}
export const Alert = forwardRef<HTMLDivElement, AlertProps>((props, ref) => {
  const { severity, iconClassName, CustomIcon, customIconColor } = props;

  return (
    <div
      data-testid="alert"
      ref={ref}
      className={classNames(
        "rounded-md  p-3",
        props.className,
        severity === "error" && "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-200",
        severity === "warning" && "text-attention bg-attention dark:bg-orange-900 dark:text-orange-200",
        severity === "info" && "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200",
        severity === "green" && "bg-success text-success",
        severity === "success" && "bg-inverted text-inverted",
        severity === "neutral" && "bg-subtle text-default"
      )}>
      <div className="relative flex md:flex-row">
        {CustomIcon ? (
          <div className="flex-shrink-0">
            <Icon
              name={CustomIcon}
              data-testid="custom-icon"
              aria-hidden="true"
              className={classNames(`h-5 w-5`, iconClassName, customIconColor ?? "text-default")}
            />
          </div>
        ) : (
          <div className="flex-shrink-0">
            {severity === "error" && (
              <Icon
                name="circle-x"
                data-testid="circle-x"
                className={classNames("h-5 w-5 text-red-900 dark:text-red-200", iconClassName)}
                aria-hidden="true"
              />
            )}
            {severity === "warning" && (
              <Icon
                name="triangle-alert"
                data-testid="alert-triangle"
                className={classNames("text-attention h-5 w-5 dark:text-orange-200", iconClassName)}
                aria-hidden="true"
              />
            )}
            {severity === "info" && (
              <Icon
                name="info"
                data-testid="info"
                className={classNames("h-5 w-5 text-blue-900 dark:text-blue-200", iconClassName)}
                aria-hidden="true"
              />
            )}
            {severity === "neutral" && (
              <Icon
                name="info"
                data-testid="neutral"
                className={classNames("text-default h-5 w-5 fill-transparent", iconClassName)}
                aria-hidden="true"
              />
            )}
            {severity === "success" && (
              <Icon
                name="circle-check"
                data-testid="circle-check"
                className={classNames("fill-muted text-default h-5 w-5", iconClassName)}
                aria-hidden="true"
              />
            )}
          </div>
        )}
        <div className="flex flex-grow flex-col sm:flex-row">
          <div className="ltr:ml-3 rtl:mr-3">
            <h3 className="text-sm font-medium">{props.title}</h3>
            <div className="text-sm">{props.message}</div>
          </div>
          {props.actions && <div className="ml-auto mt-2 text-sm sm:mt-0 md:relative">{props.actions}</div>}
        </div>
      </div>
    </div>
  );
});

Alert.displayName = "Alert";
