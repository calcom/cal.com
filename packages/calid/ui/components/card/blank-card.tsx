import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { Icon, type IconName } from "@calid/features/ui/components/icon/Icon";
import type { ReactNode } from "react";
import React from "react";

export function BlankCard({
  Icon: icon,
  customIcon,
  avatar,
  headline,
  description,
  buttonText,
  buttonOnClick,
  buttonRaw,
  className,
  iconClassName,
  iconWrapperClassName,
}: {
  Icon?: IconName;
  customIcon?: React.ReactElement;
  avatar?: React.ReactElement;
  headline: string | React.ReactElement;
  description?: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  buttonRaw?: ReactNode;
  iconWrapperClassName?: string;
  iconClassName?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="blank-card"
      className={cn(
        "border-border bg-default rounded-md border-2 border-dashed px-4 py-14 text-center",
        className
      )}>
      {/* Avatar / Icon */}
      {avatar ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
          {avatar}
        </div>
      ) : icon ? (
        <div
          className={cn(
            "bg-muted border-border mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border",
            iconWrapperClassName
          )}>
          <Icon name={icon} className={cn("text-g h-6 w-6", iconClassName)} />
        </div>
      ) : (
        customIcon && (
          <div className="bg-subtle mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            {customIcon}
          </div>
        )
      )}

      {/* Headline */}
      <p className="text-sm font-medium">{headline}</p>

      {/* Description (optional) */}
      {description && <div className="mb-4 text-sm text-gray-500">{description}</div>}

      {/* Button */}
      {buttonRaw
        ? buttonRaw
        : buttonOnClick &&
          buttonText && (
            <Button onClick={buttonOnClick} color="primary">
              {buttonText}
            </Button>
          )}
    </div>
  );
}
