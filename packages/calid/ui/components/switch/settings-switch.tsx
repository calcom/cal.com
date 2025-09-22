import { cn } from "@calid/features/lib/cn";
import React from "react";

import { Switch } from "./switch";

interface SettingsSwitchProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  toggleSwitchAtTheEnd?: boolean;
  className?: string;
  tooltip?: string;
}

export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  toggleSwitchAtTheEnd = false,
  className,
  tooltip,
}) => {
  const content = (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className={cn("text-sm font-medium text-gray-900", disabled && "cursor-not-allowed opacity-50")}>
          {title}
        </p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="ml-6 flex-shrink-0">
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} tooltip={tooltip} />
      </div>
    </div>
  );

  return (
    <div className={cn("py-2", className)}>
      {toggleSwitchAtTheEnd ? (
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p
              className={cn("text-primary text-sm font-medium", disabled && "cursor-not-allowed opacity-50")}>
              {title}
            </p>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          <div className="ml-6 flex-shrink-0">
            <Switch
              checked={checked}
              onCheckedChange={onCheckedChange}
              disabled={disabled}
              tooltip={tooltip}
            />
          </div>
        </div>
      ) : (
        content
      )}
    </div>
  );
};
