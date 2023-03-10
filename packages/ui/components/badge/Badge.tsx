import { GoPrimitiveDot } from "react-icons/go";

import classNames from "@calcom/lib/classNames";
import type { SVGComponent } from "@calcom/types/SVGComponent";

const badgeClassNameByVariant = {
  default: "bg-attention text-attention",
  warning: "bg-attention text-attention",
  orange: "bg-attention text-attention",
  success: "bg-success text-success",
  green: "bg-success text-success",
  gray: "bg-subtle text-emphasis",
  blue: "bg-info text-info",
  red: "bg-error text-error",
  error: "bg-error text-error",
};

const classNameBySize = {
  default: "h-5",
  lg: "h-6",
};

export type BadgeProps = {
  variant: keyof typeof badgeClassNameByVariant;
  size?: keyof typeof classNameBySize;
  StartIcon?: SVGComponent;
  bold?: boolean;
  withDot?: boolean;
  rounded?: boolean;
} & JSX.IntrinsicElements["div"];

export const Badge = function Badge(props: BadgeProps) {
  const {
    variant = "default",
    className,
    size = "default",
    rounded,
    StartIcon,
    withDot,
    bold,
    ...passThroughProps
  } = props;
  const hasIconOrDot = StartIcon || withDot;
  return (
    <div
      {...passThroughProps}
      className={classNames(
        "inline-flex items-center justify-center py-0.5 px-[6px] text-xs",
        bold ? "font-semibold" : "font-normal",
        rounded ? "min-w-5 min-h-5 rounded-full pt-1" : "rounded-md",
        !hasIconOrDot ? classNameBySize[size] : "",
        badgeClassNameByVariant[variant],
        className
      )}>
      <>
        {StartIcon && <StartIcon className="h-3 w-3 stroke-[3px] ltr:mr-1 rtl:ml-1" />}
        {withDot && <GoPrimitiveDot className="h-3 w-3 stroke-[3px] ltr:mr-1 rtl:ml-1" />}
        {props.children}
      </>
    </div>
  );
};
