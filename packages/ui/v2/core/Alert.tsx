import { CheckCircleIcon, ExclamationIcon, InformationCircleIcon, XCircleIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import { ReactNode } from "react";

export interface AlertProps {
  title?: ReactNode;
  message?: ReactNode;
  actions?: ReactNode;
  className?: string;
  severity: "success" | "warning" | "error" | "info";
}
export function Alert(props: AlertProps) {
  const { severity } = props;

  return (
    <div
      className={classNames(
        "rounded-md border border-opacity-20 p-3",
        props.className,
        severity === "error" && "border-red-900 bg-red-50 text-red-800",
        severity === "warning" && "border-yellow-700 bg-yellow-50 text-yellow-700",
        severity === "info" && "border-sky-700 bg-sky-50 text-sky-700",
        severity === "success" && "bg-gray-900 text-white"
      )}>
      <div className="flex">
        <div className="flex-shrink-0">
          {severity === "error" && (
            <XCircleIcon className={classNames("h-5 w-5 text-red-400")} aria-hidden="true" />
          )}
          {severity === "warning" && (
            <ExclamationIcon className={classNames("h-5 w-5 text-yellow-400")} aria-hidden="true" />
          )}
          {severity === "info" && (
            <InformationCircleIcon className={classNames("h-5 w-5 text-sky-400")} aria-hidden="true" />
          )}
          {severity === "success" && (
            <CheckCircleIcon className={classNames("h-5 w-5 text-gray-400")} aria-hidden="true" />
          )}
        </div>
        <div className="ml-3 flex-grow">
          <h3 className="text-sm font-medium">{props.title}</h3>
          <div className="text-sm">{props.message}</div>
        </div>
        {props.actions && <div className="text-sm">{props.actions}</div>}
      </div>
    </div>
  );
}
