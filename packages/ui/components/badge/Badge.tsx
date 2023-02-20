import React from "react";
import { GoPrimitiveDot } from "react-icons/go";

import classNames from "@calcom/lib/classNames";
import type { SVGComponent } from "@calcom/types/SVGComponent";

const badgeClassNameByVariant = {
  default: "bg-orange-100 text-orange-800",
  warning: "bg-orange-100 text-orange-800",
  orange: "bg-orange-100 text-orange-800",
  success: "bg-green-100 text-green-800",
  green: "bg-green-100 text-green-800",
  gray: "bg-gray-100 text-gray-800 dark:bg-darkgray-200 dark:text-darkgray-800 group-hover:bg-gray-200 dark:group-hover:bg-darkgray-300",
  blue: "bg-blue-100 text-blue-800",
  red: "bg-red-100 text-red-800",
  error: "bg-red-100 text-red-800",
};

const classNameBySize = {
  default: "h-5",
  lg: "h-6",
};

export type BadgeBaseProps = {
  variant: keyof typeof badgeClassNameByVariant;
  size?: keyof typeof classNameBySize;
  StartIcon?: SVGComponent;
  bold?: boolean;
  withDot?: boolean;
  rounded?: boolean;
};

export type BadgeProps =
  /**
   * This union type helps TypeScript understand that there's two options for this component:
   * Either it's a div element on which the onClick prop is not allowed, or it's a button element
   * on which the onClick prop is required. This is because the onClick prop is used to determine
   * whether the component should be a button or a div.
   */
  | (BadgeBaseProps & Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> & { onClick?: never })
  | (BadgeBaseProps & Omit<React.HTMLAttributes<HTMLButtonElement>, "onClick"> & { onClick: () => void });

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
  const isButton = "onClick" in passThroughProps && passThroughProps.onClick !== undefined;
  const hasIconOrDot = StartIcon || withDot;

  const classes = classNames(
    "inline-flex items-center justify-center py-0.5 px-[6px] text-xs transition-colors",
    bold ? "font-semibold" : "font-normal",
    rounded ? "min-w-5 min-h-5 rounded-full pt-1" : "rounded-md",
    // @TODO: Hover states
    isButton && "hover:bg-gray-100",
    !hasIconOrDot ? classNameBySize[size] : "",
    badgeClassNameByVariant[variant],
    className
  );

  const Children = () => (
    <>
      {StartIcon && <StartIcon className="h-3 w-3 stroke-[3px] ltr:mr-1 rtl:ml-1" />}
      {withDot && <GoPrimitiveDot className="h-3 w-3 stroke-[3px] ltr:mr-1 rtl:ml-1" />}
      {props.children}
    </>
  );

  if (isButton) {
    return (
      <button {...passThroughProps} className={classes}>
        <Children />
      </button>
    );
  }

  return (
    <div {...passThroughProps} className={classes}>
      <Children />
    </div>
  );
};
