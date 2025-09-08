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
        default: "border bg-primary text-primary",
        secondary: "bg-muted text-subtle",
        destructive: "border bg-destructive text-destructive-foreground",
        outline: "text-default text-sm",
        success: "border bg-white border-green-600 text-green-600",
        attention: "bg-yellow-50 text-yellow-600",
      },
      size: {
        sm: "h-5 px-1.5 text-xs",
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
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof children === "string") {
      navigator.clipboard.writeText(children).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
      });
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
        (StartIcon ? <Icon name={StartIcon} data-testid="start-icon" className="h-3 w-3 mr-1" /> : null)}
      {children}
      {isPublicUrl && (
        <div className="ml-1 flex items-center">
          <TooltipProvider delayDuration={0}>
            <Tooltip
              open={isCopied ? true : undefined}
              onOpenChange={(open) => {
                if (!isCopied) {
                  return;
                }
                if (!open) {
                  setIsCopied(false);
                }
              }}>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
                  StartIcon="copy"
                  color="minimal"
                  className="border-none"
                  size="xs"
                  onClick={handleCopyUrl}
                  data-testid="copy-url-button"
                />
              </TooltipTrigger>
              <TooltipContent>{isCopied ? t("copied") : t("copy")}</TooltipContent>{" "}
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
                  StartIcon="external-link"
                  color="minimal"
                  className="border-none"
                  size="xs"
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
