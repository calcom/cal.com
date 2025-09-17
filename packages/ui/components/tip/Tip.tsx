import type { ReactNode } from "react";
import React from "react";

import classNames from "@calcom/ui/classNames";

import { Icon } from "../icon";

export interface TipProps {
  children: ReactNode;
  className?: string;
  variant?: "blue" | "green" | "yellow" | "red";
  icon?: "info" | "check" | "alert" | "warning";
}

const variantStyles = {
  blue: {
    container: "border-blue-400 bg-blue-100 text-blue-800",
    icon: "text-blue-600",
  },
  green: {
    container: "border-green-400 bg-green-100 text-green-800",
    icon: "text-green-600",
  },
  yellow: {
    container: "border-yellow-400 bg-yellow-100 text-yellow-800",
    icon: "text-yellow-600",
  },
  red: {
    container: "border-red-400 bg-red-100 text-red-800",
    icon: "text-red-600",
  },
};

const iconMap = {
  info: "info",
  check: "check",
  alert: "circle-alert",
  warning: "triangle-alert",
} as const;

export function Tip({ children, className, variant = "blue", icon = "info" }: TipProps) {
  const styles = variantStyles[variant];
  const iconName = iconMap[icon];

  return (
    <div
      className={classNames(
        "flex w-full items-start gap-2 rounded-md border px-3 py-2",
        styles.container,
        className
      )}>
      <Icon name={iconName} size={16} className={classNames("mt-0.5 flex-shrink-0", styles.icon)} />
      <div className="text-sm leading-5">{children}</div>
    </div>
  );
}
