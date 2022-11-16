import { ExclamationIcon } from "@heroicons/react/outline";
import { XIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import noop from "lodash/noop";
import { ReactNode } from "react";

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
        " z-50 flex min-h-[40px] w-full items-start justify-between gap-8 bg-gray-50 px-4 text-center sm:items-center",
        variantClassName[variant]
      )}>
      <div className="flex flex-1 items-center justify-center gap-2 p-1">
        <p className="flex items-center justify-center gap-2 font-sans text-sm font-medium leading-4 text-gray-900">
          {["warning", "error"].includes(variant) && (
            <ExclamationIcon className="h-5 w-5 text-black" aria-hidden="true" />
          )}
          {text}
        </p>
        {actions && <div className="text-sm">{actions}</div>}
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
