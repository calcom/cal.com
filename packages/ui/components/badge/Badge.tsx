import { GoPrimitiveDot } from "react-icons/go";

import classNames from "@calcom/lib/classNames";
import type { SVGComponent } from "@calcom/types/SVGComponent";

const badgeClassNameByVariant = {
  default: "bg-attention text-orange-800",
  warning: "bg-attention text-orange-800",
  orange: "bg-attention text-orange-800",
  success: "bg-success text-green-800",
  green: "bg-success text-green-800",
  gray: "bg-subtle text-gray-800 dark:bg-darkgray-200 dark:text-darkgray-800 group-hover:bg-emphasis dark:group-hover:bg-darkgray-300",
  blue: "bg-info text-blue-800",
  red: "bg-error text-red-800",
  error: "bg-error text-red-800",
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
