import { MouseEvent } from "react";
import { Icon } from "react-feather";

import classNames from "@calcom/lib/classNames";

import Button from "./Button";

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
  Icon?: Icon;
  onDismiss: (event: MouseEvent<HTMLElement, MouseEvent>) => void;
  onAction?: (event: MouseEvent<HTMLElement, MouseEvent>) => void;
  actionText?: string;
} & JSX.IntrinsicElements["div"];

const Banner = (props: BannerProps) => {
  const { variant, errorMessage, title, description, ...rest } = props;
  const buttonStyle = classNames(stylesByVariant[variant].text, stylesByVariant[variant].hover);
  return (
    <div
      className={classNames(
        "flex items-center rounded-md px-3 py-4",
        stylesByVariant[variant].background,
        stylesByVariant[variant].text,
        variant !== "error" && "h-16",
        props.className
      )}
      {...rest}>
      <div className="mr-2 self-start">{props.Icon && <props.Icon className="h-4 w-4" />}</div>
      <div className={classNames("flex flex-col text-sm")}>
        <h1 className="font-semibold">{title}</h1>
        {description && <h2 className="font-normal">{description}</h2>}
        {props.variant === "error" && <p className="ml-6 pt-2 font-mono italic">{errorMessage}</p>}
      </div>
      <div className="ml-auto text-sm font-medium">
        {props.actionText && (
          <Button color="minimal" className={buttonStyle} onClick={() => props.onAction}>
            Action
          </Button>
        )}
        <Button color="minimal" className={buttonStyle} onClick={() => props.onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
};

export default Banner;
