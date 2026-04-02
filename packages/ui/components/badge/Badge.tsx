import classNames from "@calcom/ui/classNames";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import React from "react";
import type { IconName } from "../icon";
import { Icon } from "../icon";

export const badgeStyles = cva("font-medium inline-flex items-center justify-center rounded-[4px] gap-x-1", {
  variants: {
    variant: {
      default: "bg-attention text-attention",
      warning: "bg-attention text-attention",
      orange: "bg-attention text-attention",
      success: "bg-cal-success text-success",
      green: "bg-cal-success text-success",
      gray: "bg-emphasis text-emphasis",
      blue: "bg-cal-info text-info",
      red: "bg-error text-error",
      error: "bg-error text-error",
      grayWithoutHover: "bg-gray-100 text-gray-800 dark:bg-darkgray-200 dark:text-darkgray-800",
      purple: "bg-purple-50 text-purple-800",
    },
    size: {
      sm: "px-1 py-1 text-[10px] leading-none",
      md: "py-1 px-1.5 text-xs leading-none",
      lg: "py-1 px-1.5 text-sm leading-none rounded-lg",
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
      startIcon?: IconName;
      withDot?: never;
      customDot?: never;
    }
  | { startIcon?: never; withDot?: true; customDot?: never }
  | { startIcon?: never; withDot?: never; customDot?: React.ReactNode };

export type BadgeBaseProps = InferredBadgeStyles & {
  children: React.ReactNode;
  rounded?: boolean;
  customStartIcon?: React.ReactNode;
  customDot?: React.ReactNode;
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
  const {
    customStartIcon,
    variant,
    className,
    size,
    startIcon,
    withDot,
    children,
    rounded,
    customDot,
    ...passThroughProps
  } = props;
  const isButton = "onClick" in passThroughProps && passThroughProps.onClick !== undefined;
  const StartIcon = startIcon;
  const classes = classNames(
    badgeStyles({ variant, size }),
    rounded && "h-5 w-5 rounded-full p-0",
    className
  );

  const Children = () => (
    <>
      {withDot ? (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" data-testid="go-primitive-dot">
          <circle cx="4" cy="4" r="4" />
        </svg>
      ) : null}
      {customStartIcon ||
        (StartIcon ? (
          <Icon
            name={StartIcon}
            data-testid="start-icon"
            className="stroke-[3px]"
            style={{ width: 12, height: 12 }}
          />
        ) : null)}
      {children}
    </>
  );

  const Wrapper = isButton ? "button" : "div";

  return React.createElement(Wrapper, { ...passThroughProps, className: classes }, <Children />);
};
