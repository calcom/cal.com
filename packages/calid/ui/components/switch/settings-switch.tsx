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
        <p className={cn("text-default text-sm font-medium", disabled && "cursor-not-allowed opacity-50")}>
          {title}
        </p>
        <p className="text-default mt-1 text-sm">{description}</p>
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
              className={cn(
                "text-emphasis text-sm font-medium",
                disabled && "cursor-not-allowed opacity-50"
              )}>
              {title}
            </p>
            <p className="text-subtle mt-1 text-sm">{description}</p>
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
