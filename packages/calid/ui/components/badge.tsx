import { cn } from "@calid/features/lib/cn";
import { Icon, type IconName } from "@calid/features/ui/components/icon/Icon";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { IS_DEV } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "./button";
import { Tooltip } from "./tooltip";

const badgeVariants = cva(
  "inline-flex items-center rounded-md text-[12px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-blue-100 text-blue-600",
        secondary: "bg-muted dark:bg-default text-subtle",
        destructive: "border bg-destructive text-destructive-foreground",
        outline: "text-default text-sm",
        success: "border bg-primary border-green-600 text-green-600",
        attention: "bg-yellow-50 text-yellow-600",
      },
      size: {
        xs: "h-4 px-1 text-xs",
        sm: "h-5 px-1.5 text-xs",
        md: "h-5 px-2 py-3",
        lg: "h-7 px-3",
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
  publicUrl?: string | null;
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
    publicUrl,
    ...passThroughProps
  } = props;
  const isButton = "onClick" in passThroughProps && passThroughProps.onClick !== undefined;
  const StartIcon = startIcon;
  const classes = cn(badgeVariants({ variant, size }), className);
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (publicUrl === null) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    });
  };
  const handleRedirectUrl = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (publicUrl === null) return;
    let url = publicUrl.trim();

    // Check if it already starts with http:// or https://
    if (!/^https?:\/\//i.test(url)) {
      url = IS_DEV ? `http://${url}` : `https://${url}`;
    }

    window.open(url, "_blank");
  };

  const Children = () => (
    <>
      {withDot ? (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" data-testid="go-primitive-dot">
          <circle cx="4" cy="4" r="4" />
        </svg>
      ) : null}
      {customStartIcon ||
        (StartIcon ? <Icon name={StartIcon} data-testid="start-icon" className="mr-1 h-3 w-3" /> : null)}
      {children}
      {publicUrl && (
        <div className="ml-1 flex items-center">
          <Tooltip content={isCopied ? t("copied") : t("copy")}>
            <Button
              variant="icon"
              StartIcon="copy"
              color="minimal"
              className="border-none"
              size="xs"
              onClick={handleCopyUrl}
              data-testid="copy-url-button"
            />
          </Tooltip>
          <Tooltip content={t("preview")}>
            <Button
              variant="icon"
              StartIcon="external-link"
              color="minimal"
              className="border-none"
              size="xs"
              onClick={handleRedirectUrl}
              data-testid="redirect-url-button"
            />
          </Tooltip>
        </div>
      )}
    </>
  );

  const Wrapper = isButton ? "button" : "div";

  return React.createElement(Wrapper, { ...passThroughProps, className: classes }, <Children />);
};
