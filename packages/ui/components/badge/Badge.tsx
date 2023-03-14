import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
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
      sm: "px-1 py-0.5 text-xs",
      md: "py-1 px-1.5 text-xs",
      lg: "py-1 px-2 text-sm",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
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
      {withDot ? <GoPrimitiveDot className="h-3 w-3 stroke-[3px]" /> : null}
      {StartIcon ? <StartIcon className="h-3 w-3 stroke-[3px]" /> : null}
      {children}
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
