import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import React from "react";
import { GoPrimitiveDot } from "react-icons/go";

import classNames from "@calcom/lib/classNames";
import type { SVGComponent } from "@calcom/types/SVGComponent";

export const badgeStyles = cva("font-medium inline-flex items-center justify-center rounded gap-x-1", {
  variants: {
    variant: {
      default: "bg-attention text-attention",
      warning: "bg-attention text-attention",
      orange: "bg-attention text-attention",
      success: "bg-success text-success",
      green: "bg-success text-success",
      gray: "bg-subtle text-emphasis",
      blue: "bg-info text-info",
      red: "bg-error text-error",
      error: "bg-error text-error",
      grayWithoutHover: "bg-gray-100 text-gray-800 dark:bg-darkgray-200 dark:text-darkgray-800",
    },
    size: {
      sm: "px-1 py-0.5 text-xs leading-3",
      md: "py-1 px-1.5 text-xs leading-3",
      lg: "py-1 px-2 text-sm leading-4",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

type InferredBadgeStyles = VariantProps<typeof badgeStyles>;

type IconOrDot =
  | {
      startIcon?: SVGComponent;
      withDot?: unknown;
    }
  | { startIcon?: unknown; withDot?: boolean };

export type BadgeBaseProps = InferredBadgeStyles & {
  children: React.ReactNode;
  rounded?: boolean;
} & IconOrDot;

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
  const { variant, className, size, startIcon, withDot, children, rounded, ...passThroughProps } = props;
  const isButton = "onClick" in passThroughProps && passThroughProps.onClick !== undefined;
  const StartIcon = startIcon ? (startIcon as SVGComponent) : undefined;
  const classes = classNames(
    badgeStyles({ variant, size }),
    rounded && "h-5 w-5 rounded-full p-0",
    className
  );

  const Children = () => (
    <>
      {withDot ? <GoPrimitiveDot data-testid="go-primitive-dot" className="h-3 w-3 stroke-[3px]" /> : null}
      {StartIcon ? <StartIcon data-testid="start-icon" className="h-3 w-3 stroke-[3px]" /> : null}
      {children}
    </>
  );

  const Wrapper = isButton ? "button" : "div";

  return React.createElement(Wrapper, { ...passThroughProps, className: classes }, <Children />);
};
