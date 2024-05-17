import type { ReactNode } from "react";
import React from "react";

import { classNames } from "@calcom/lib";

import type { IconName } from "../..";
import { Icon } from "../..";
import { Button } from "../../components/button";

export function EmptyScreen({
  Icon: icon,
  customIcon,
  avatar,
  headline,
  description,
  buttonText,
  buttonOnClick,
  buttonRaw,
  border = true,
  dashedBorder = true,
  className,
  iconClassName,
  iconWrapperClassName,
  limitWidth = true,
}: {
  Icon?: IconName;
  customIcon?: React.ReactElement;
  avatar?: React.ReactElement;
  headline: string | React.ReactElement;
  description?: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  buttonRaw?: ReactNode; // Used incase you want to provide your own button.
  border?: boolean;
  dashedBorder?: boolean;
  iconWrapperClassName?: string;
  iconClassName?: string;
  limitWidth?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <>
      <div
        data-testid="empty-screen"
        className={classNames(
          "flex w-full select-none flex-col items-center justify-center rounded-lg p-7 lg:p-20",
          border && "border-subtle border",
          dashedBorder && "border-dashed",
          className
        )}>
        {!avatar ? null : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full">{avatar}</div>
        )}

        {!icon ? null : (
          <div
            className={classNames(
              "bg-emphasis flex h-[72px] w-[72px] items-center justify-center rounded-full ",
              iconWrapperClassName
            )}>
            <Icon
              name={icon}
              className={classNames("text-default inline-block h-10 w-10 stroke-[1.3px]", iconClassName)}
            />
          </div>
        )}
        {!customIcon ? null : <>{customIcon}</>}
        <div className={`flex ${limitWidth ? "max-w-[420px]" : ""}  flex-col items-center`}>
          <h2
            className={classNames(
              "text-semibold font-cal text-emphasis text-center text-xl",
              icon && "mt-6"
            )}>
            {headline}
          </h2>
          {description && (
            <div className="text-default mb-8 mt-3 text-center text-sm font-normal leading-6">
              {description}
            </div>
          )}
          {buttonOnClick && buttonText && <Button onClick={(e) => buttonOnClick(e)}>{buttonText}</Button>}
          {buttonRaw}
        </div>
      </div>
    </>
  );
}
