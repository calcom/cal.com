import { XCircleIcon, InformationCircleIcon, CheckCircleIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import { ReactNode } from "react";

export interface AlertProps {
  title: ReactNode;
  message?: ReactNode;
  className?: string;
  severity: "success" | "warning" | "error";
}
export function Alert(props: AlertProps) {
  const { severity } = props;

  return (
    <div
      className={classNames(
        "rounded-md p-4",
        props.className,
        severity === "error" && "bg-red-50 text-red-800",
        severity === "warning" && "bg-yellow-50 text-yellow-800",
        severity === "success" && "bg-gray-900 text-white"
      )}>
      <div className="flex">
        <div className="flex-shrink-0">
          {severity === "error" && (
            <XCircleIcon className={classNames("h-5 w-5 text-red-400")} aria-hidden="true" />
          )}
          {severity === "warning" && (
            <InformationCircleIcon className={classNames("h-5 w-5 text-yellow-400")} aria-hidden="true" />
          )}
          {severity === "success" && (
            <CheckCircleIcon className={classNames("h-5 w-5 text-gray-400")} aria-hidden="true" />
          )}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium">{props.title}</h3>
          <div className="text-sm">{props.message}</div>
        </div>
      </div>
    </div>
  );
}
