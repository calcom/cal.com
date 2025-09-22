import { Icon } from "@calid/features/ui/components/icon";
import type { IconName } from "@calid/features/ui/components/icon/Icon";
import type { ReactNode } from "react";
import React from "react";

import classNames from "@calcom/ui/classNames";

export function EmptyScreen({
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
      data-testid="empty-screen"
      className={classNames(
        "bg-default rounded-lg border-2 border-dashed border-gray-300 py-12 text-center",
        className
      )}>
      {/* Avatar / Icon */}
      {avatar ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
          {avatar}
        </div>
      ) : icon ? (
        <div
          className={classNames(
            "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200",
            iconWrapperClassName
          )}>
          <Icon name={icon} className={classNames("h-6 w-6 text-gray-400", iconClassName)} />
        </div>
      ) : (
        customIcon && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
            {customIcon}
          </div>
        )
      )}

      {/* Headline */}
      <p className="mb-4 text-sm font-medium">{headline}</p>

      {/* Description (optional) */}
      {description && <div className="mb-4 text-sm text-gray-500">{description}</div>}

      {/* Button */}
      {buttonRaw
        ? buttonRaw
        : buttonOnClick &&
          buttonText && (
            <button
              onClick={buttonOnClick}
              className="bg-primary hover:bg-primary/90 text-default rounded-lg px-4 py-2 font-medium"
              style={{ fontSize: "14px" }}>
              {buttonText}
            </button>
          )}
    </div>
  );
}
