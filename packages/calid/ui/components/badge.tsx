import { cn } from "@calid/features/lib/cn";
import { Icon, type IconName } from "@calid/features/ui/components/icon/Icon";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-md text-[12px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border bg-primary text-primary hover:bg-primary/80",
        secondary: "bg-muted text-subtle hover:bg-subtle/80",
        destructive: "border bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border bg-white border-green-600 text-green-600",
      },
      size: {
        sm: "h-5 px-2 text-xs",
        md: "h-6 px-2.5 text-sm",
        lg: "h-7 px-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

type InferredBadgeStyles = VariantProps<typeof badgeVariants>;

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
  const { customStartIcon, variant, className, size, startIcon, withDot, children, ...passThroughProps } =
    props;
  const isButton = "onClick" in passThroughProps && passThroughProps.onClick !== undefined;
  const StartIcon = startIcon;
  const classes = cn(badgeVariants({ variant, size }), className);

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
            className="mx-1 stroke-[3px]"
            style={{ width: 12, height: 12 }}
          />
        ) : null)}
      {children}
    </>
  );

  const Wrapper = isButton ? "button" : "div";

  return React.createElement(Wrapper, { ...passThroughProps, className: classes }, <Children />);
};
