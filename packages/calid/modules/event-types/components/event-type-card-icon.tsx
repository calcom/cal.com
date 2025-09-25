import { Button } from "@calid/features/ui/components/button";
import type { IconName } from "@calid/features/ui/components/icon";
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

export const EventTypeCardIcon: React.FC<EventTypeCardIconProps> = ({ iconParams, onClick }) => {
  const iconName = (iconParams?.icon?.toLowerCase() as IconName) || "calendar";
  const iconColor = iconParams?.color || "#6b7280";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <div className="flex items-center justify-center">
      <Button
        variant="button"
        StartIcon={iconName}
        color="secondary"
        className="bg-muted h-10 w-10"
        iconColor={iconColor}
        onClick={handleClick}
      />
    </div>
  );
};
