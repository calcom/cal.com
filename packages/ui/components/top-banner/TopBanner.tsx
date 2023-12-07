import classNames from "classnames";
import type { ComponentType, ReactNode } from "react";

import { TOP_BANNER_HEIGHT } from "@calcom/lib/constants";
import type { LucideIcon, LucideProps } from "@calcom/ui/components/icon";
import { AlertTriangle, Info } from "@calcom/ui/components/icon";

export type TopBannerProps = {
  Icon?: ComponentType<LucideProps> & LucideIcon;
  text: string;
  variant?: keyof typeof variantClassName;
  actions?: ReactNode;
};

const variantClassName = {
  default: "bg-gradient-primary",
  warning: "bg-orange-400",
  error: "bg-red-400",
};

const defaultIconProps = {
  className: "text-emphasis h-4 w-4 stroke-[2.5px]",
  "aria-hidden": "true",
} as LucideProps;

export function TopBanner(props: TopBannerProps) {
  const { Icon, variant = "default", text, actions } = props;

  const renderDefaultIconByVariant = () => {
    switch (variant) {
      case "error":
        return <AlertTriangle {...defaultIconProps} data-testid="variant-error" />;
      case "warning":
        return <Info {...defaultIconProps} data-testid="variant-warning" />;
      default:
        return null;
    }
  };
  const defaultIcon = renderDefaultIconByVariant();

  return (
    <div
      data-testid="banner"
      style={{ minHeight: TOP_BANNER_HEIGHT }}
      className={classNames(
        "flex w-full items-start justify-between gap-8 px-4 py-2 text-center lg:items-center",
        variantClassName[variant]
      )}>
      <div className="flex flex-1 flex-col items-start justify-center gap-2 p-1 lg:flex-row lg:items-center">
        <p className="text-emphasis flex flex-col items-start justify-center gap-2 text-left font-sans text-sm font-medium leading-4 lg:flex-row lg:items-center">
          {Icon ? <Icon data-testid="variant-default" {...defaultIconProps} /> : defaultIcon}
          {text}
        </p>
        {actions && <div className="text-sm font-medium">{actions}</div>}
      </div>
    </div>
  );
}
