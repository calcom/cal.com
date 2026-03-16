"use client";

import {
  Card,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import { Switch } from "@coss/ui/components/switch";

interface SettingsToggleProps {
  title: string;
  description: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function SettingsToggle({
  title,
  description,
  defaultChecked = false,
  checked,
  onCheckedChange,
  disabled,
  loading = false,
}: SettingsToggleProps) {
  const isControlled = checked !== undefined;
  return (
    <Card>
      <CardPanel>
        <div className="flex items-center justify-between gap-4">
          <CardFrameHeader className="p-0">
            <CardFrameTitle>{title}</CardFrameTitle>
            <CardFrameDescription>{description}</CardFrameDescription>
          </CardFrameHeader>
          {loading ? (
            <Skeleton className="h-4.5 w-7.5 rounded-full" />
          ) : (
            <Switch
              checked={isControlled ? checked : undefined}
              defaultChecked={isControlled ? undefined : defaultChecked}
              onCheckedChange={onCheckedChange}
              disabled={disabled}
            />
          )}
        </div>
      </CardPanel>
    </Card>
  );
}
