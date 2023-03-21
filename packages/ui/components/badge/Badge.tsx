import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { GoPrimitiveDot } from "react-icons/go";

import classNames from "@calcom/lib/classNames";
import type { SVGComponent } from "@calcom/types/SVGComponent";

const badgeStyles = cva("font-medium inline-flex items-center justify-center rounded gap-x-1", {
  variants: {
    variant: {
      default: "bg-orange-100 text-orange-800",
      warning: "bg-orange-100 text-orange-800",
      orange: "bg-orange-100 text-orange-800",
      success: "bg-green-100 text-green-800",
      green: "bg-green-100 text-green-800",
      gray: "bg-gray-100 text-gray-800 dark:bg-darkgray-200 dark:text-darkgray-800 group-hover:bg-gray-200 dark:group-hover:bg-darkgray-300",
      blue: "bg-blue-100 text-blue-800",
      red: "bg-red-100 text-red-800",
      error: "bg-red-100 text-red-800",
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

export type BadgeProps = InferredBadgeStyles &
  ComponentProps<"div"> & { children: ReactNode; rounded?: boolean } & IconOrDot;

export const Badge = function Badge(props: BadgeProps) {
  const { variant, className, size, startIcon, withDot, children, rounded, ...passThroughProps } = props;
  const StartIcon = startIcon ? (startIcon as SVGComponent) : undefined;
  return (
    <div
      className={classNames(badgeStyles({ variant, size }), rounded && "h-5 w-5 rounded-full p-0", className)}
      {...passThroughProps}>
      {withDot ? <GoPrimitiveDot className="h-3 w-3 stroke-[3px]" /> : null}
      {StartIcon ? <StartIcon className="h-3 w-3 stroke-[3px]" /> : null}
      <div>{children}</div>
    </div>
  );
};
