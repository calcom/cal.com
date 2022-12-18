import { MouseEvent, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { SVGComponent } from "@calcom/types/SVGComponent";

const stylesByVariant = {
  neutral: { background: "bg-gray-100 ", text: "!text-gray-800", hover: "hover:!bg-gray-200" },
  warning: { background: "bg-orange-100 ", text: "!text-orange-800", hover: "hover:!bg-orange-200" },
  error: { background: "bg-red-100 ", text: "!text-red-800", hover: "hover:!bg-red-200" },
};

export type BannerProps = {
  title: string;
  description?: string;
  variant: keyof typeof stylesByVariant;
  errorMessage?: string;
  Icon?: SVGComponent;
  onDismiss: (event: MouseEvent<HTMLElement, globalThis.MouseEvent>) => void;
  onAction?: (event: MouseEvent<HTMLElement, globalThis.MouseEvent>) => void;
  actionText?: string;
} & JSX.IntrinsicElements["div"];

const Banner = (props: BannerProps) => {
  const { variant, errorMessage, title, description, className, Icon, ...rest } = props;
  const [show, setShow] = useState(true);
  if (!show) {
    return null;
  }
  return (
    <div
      className={classNames(
        "flex items-center rounded-md px-4 py-4",
        stylesByVariant[variant].background,
        stylesByVariant[variant].text,
        className
      )}
      {...rest}>
      <div className={classNames("flex flex-col text-sm")}>
        <div className="mb-2">{Icon && <Icon className="h-4 w-4" />}</div>
        <div className="flex flex-col space-y-2">
          <h1 className="font-semibold leading-none">{title}</h1>
          {description && <h2 className="font-normal leading-4">{description}</h2>}
          {props.variant === "error" && <p className="ml-4 pt-2 font-mono text-xs">{errorMessage}</p>}
        </div>
        <div className="mt-4 flex w-full items-center gap-4 self-start text-sm font-medium">
          {props.actionText && (
            <button className="text-sm font-medium leading-4" onClick={() => props.onAction}>
              Action
            </button>
          )}
          <button
            className="text-sm font-medium leading-4"
            onClick={(e) => {
              setShow(false);
              props.onDismiss(e);
            }}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default Banner;
