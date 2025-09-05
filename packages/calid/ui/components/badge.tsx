import { cn } from "@calid/features/lib/cn";
import { Icon, type IconName } from "@calid/features/ui/components/icon/Icon";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm text-[12px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border bg-primary text-primary hover:bg-primary/80",
        secondary: "bg-muted text-subtle hover:bg-subtle/80",
        destructive: "border bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-default text-sm",
        success: "border bg-white border-green-600 text-green-600",
        attention: "border bg-yellow-50 rounded-md border-yellow-600 text-yellow-600",
      },
      size: {
        sm: "h-4 px-2 text-[10px]",
        md: "h-5 px-2 py-3 text-xs",
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
  isPublicUrl?: boolean;
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
  const { t } = useLocale();
  const {
    customStartIcon,
    variant,
    className,
    size,
    startIcon,
    withDot,
    children,
    isPublicUrl,
    ...passThroughProps
  } = props;
  const isButton = "onClick" in passThroughProps && passThroughProps.onClick !== undefined;
  const StartIcon = startIcon;
  const classes = cn(badgeVariants({ variant, size }), className);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof children === "string") {
      navigator.clipboard.writeText(children);
    }
  };

  const handleRedirectUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof children === "string") {
      window.open(children, "_blank", "noopener,noreferrer");
    }
  };

  const Children = () => (
    <>
      {withDot ? (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" data-testid="go-primitive-dot">
          <circle cx="4" cy="4" r="4" />
        </svg>
      ) : null}
      {customStartIcon ||
        (StartIcon ? <Icon name={StartIcon} data-testid="start-icon" className="h-3 w-3" /> : null)}
      {children}
      {isPublicUrl && (
        <div className="ml-1 flex items-center">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
                  StartIcon="copy"
                  color="minimal"
                  size="sm"
                  onClick={handleCopyUrl}
                  data-testid="copy-url-button"
                />
              </TooltipTrigger>
              <TooltipContent>{t("copy")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
                  StartIcon="external-link"
                  color="minimal"
                  size="sm"
                  onClick={handleRedirectUrl}
                  data-testid="redirect-url-button"
                />
              </TooltipTrigger>
              <TooltipContent>{t("preview")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </>
  );

  const Wrapper = isButton ? "button" : "div";

  return React.createElement(Wrapper, { ...passThroughProps, className: classes }, <Children />);
};
