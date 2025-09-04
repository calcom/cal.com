import type { IconName } from "@calid/features/ui";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import React from "react";

export interface IconParams {
  icon: IconName;
  color: string;
}

interface EventTypeCardIconProps {
  iconParams?: IconParams;
  className?: string;
  onClick?: () => void;
}

export const EventTypeCardIcon: React.FC<EventTypeCardIconProps> = ({
  iconParams,
  className = "h-5 w-5",
  onClick,
}) => {
  // Fallback to calendar icon in gray if no iconParams
  const iconName = iconParams?.icon || "calendar";
  const iconColor = iconParams?.color || "#6b7280"; // gray-500

  return (
    <div className={`flex items-center justify-center ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      <Icon name={iconName} className={className} style={{ color: iconColor }} />
    </div>
  );
};
