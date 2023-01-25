import { XIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import noop from "lodash/noop";
import { ReactNode } from "react";

import { FiAlertTriangle, FiInfo } from "@calcom/ui/components/icon";

export type TopBannerProps = {
  text: string;
  variant?: keyof typeof variantClassName;
  actions?: ReactNode;
  onClose?: () => void;
};

const variantClassName = {
  default: "bg-gradient-primary",
  warning: "bg-orange-400",
  error: "bg-red-400",
};

export function TopBanner(props: TopBannerProps) {
  const { variant = "default", text, actions, onClose } = props;
  return (
    <div
      data-testid="banner"
      className={classNames(
        "flex min-h-[40px] w-full items-start justify-between gap-8 py-2 px-4 text-center lg:items-center",
        variantClassName[variant]
      )}>
      <div className="flex flex-1 flex-col items-start justify-center gap-2 p-1 lg:flex-row lg:items-center">
        <p className="flex flex-col items-start justify-center gap-2 text-left font-sans text-sm font-medium leading-4 text-gray-900 lg:flex-row lg:items-center">
          {variant === "error" && (
            <FiAlertTriangle className="h-4 w-4 stroke-[2.5px] text-black" aria-hidden="true" />
          )}
          {variant === "warning" && (
            <FiInfo className="h-4 w-4 stroke-[2.5px] text-black" aria-hidden="true" />
          )}
          {text}
        </p>
        {actions && <div className="text-sm font-medium">{actions}</div>}
      </div>
      {typeof onClose === "function" && (
        <button
          type="button"
          onClick={noop}
          className="hover:bg-gray-20 flex items-center rounded-lg p-1.5 text-sm text-gray-400">
          <XIcon className="h-4 w-4 text-black" />
        </button>
      )}
    </div>
  );
}
