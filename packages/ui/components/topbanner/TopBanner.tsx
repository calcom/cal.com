import { ExclamationIcon } from "@heroicons/react/outline";
import { XIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import { ReactNode, useState } from "react";

export type TopBannerProps = {
  text: string;
  color?: keyof typeof variantClassName;
  actions?: ReactNode;
};

const variantClassName = {
  default: "bg-gradient-primary",
  warning: "bg-orange-400",
  error: "bg-red-400",
};

export function TopBanner(props: TopBannerProps) {
  const { color = "default", text } = props;
  const [isOpen, setOpen] = useState(true);

  return (
    <div
      id="banner"
      className={classNames(
        " z-50 flex  h-[40px] w-full items-start justify-between gap-8 border border-b border-gray-200 bg-gray-50 px-4 text-center sm:items-center",
        variantClassName[color],
        isOpen ? "sticky" : "hidden"
      )}>
      <div className="flex flex-1 items-center justify-center gap-2">
        <p className="flex items-center justify-center gap-2 font-sans text-sm font-medium leading-4 text-gray-900">
          {(color === "warning" || "error") && (
            <ExclamationIcon className={classNames("h-5 w-5 text-black")} aria-hidden="true" />
          )}
          {text}
        </p>
        {props.actions && <div className="text-sm">{props.actions}</div>}
      </div>
      <button
        data-collapse-toggle="banner"
        type="button"
        onClick={() => setOpen((open) => !open)}
        className="hover:bg-gray-20 flex items-center rounded-lg p-1.5 text-sm text-gray-400">
        <XIcon className={classNames("h-4 w-4 text-black")} />
      </button>
    </div>
  );
}
