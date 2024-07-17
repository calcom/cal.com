import classNames from "classnames";
import type { LucideProps } from "lucide-react";
import type { ReactNode } from "react";

import { TOP_BANNER_HEIGHT } from "@calcom/lib/constants";

import { Icon, type IconName } from "../..";

export type TopBannerProps = {
  icon?: IconName;
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
  const { icon, variant = "default", text, actions } = props;

  const renderDefaultIconByVariant = () => {
    switch (variant) {
      case "error":
        return <Icon {...defaultIconProps} name="triangle-alert" data-testid="variant-error" />;
      case "warning":
        return <Icon {...defaultIconProps} name="info" data-testid="variant-warning" />;
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
      <div className="flex flex-1 flex-col items-start justify-center gap-2 px-1 py-0.5 lg:flex-row lg:items-center">
        <p className="text-emphasis flex flex-col items-start justify-center gap-2 text-left font-sans text-sm font-medium leading-4 lg:flex-row lg:items-center">
          {icon ? <Icon {...defaultIconProps} name={icon} data-testid="variant-default" /> : defaultIcon}
          {text}
        </p>
        {actions && <div className="text-sm font-medium">{actions}</div>}
      </div>
    </div>
  );
}
