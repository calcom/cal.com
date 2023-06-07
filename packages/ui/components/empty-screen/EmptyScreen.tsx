import type { LucideIcon as IconType } from "lucide-react";
import type { ReactNode } from "react";
import React from "react";

import { classNames } from "@calcom/lib";
import type { SVGComponent } from "@calcom/types/SVGComponent";

import { Button } from "../../components/button";

export function EmptyScreen({
  Icon,
  avatar,
  headline,
  description,
  buttonText,
  buttonOnClick,
  buttonRaw,
  border = true,
  dashedBorder = true,
  className,
}: {
  Icon?: SVGComponent | IconType;
  avatar?: React.ReactElement;
  headline: string | React.ReactElement;
  description: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  buttonRaw?: ReactNode; // Used incase you want to provide your own button.
  border?: boolean;
  dashedBorder?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <>
      <div
        data-testid="empty-screen"
        className={classNames(
          "min-h-80 flex w-full flex-col items-center justify-center rounded-md p-7 lg:p-20",
          border && "border-subtle border",
          dashedBorder && "border-dashed",
          className
        )}>
        {!avatar ? null : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full">{avatar}</div>
        )}
        {!Icon ? null : (
          <div className="bg-emphasis flex h-[72px] w-[72px] items-center justify-center rounded-full ">
            <Icon className="text-default inline-block h-10 w-10 stroke-[1.3px]" />
          </div>
        )}
        <div className="flex max-w-[420px] flex-col items-center">
          <h2 className="text-semibold font-cal text-emphasis mt-6 text-center text-xl">{headline}</h2>
          <div className="text-default mt-3 mb-8 text-center text-sm font-normal leading-6">
            {description}
          </div>
          {buttonOnClick && buttonText && <Button onClick={(e) => buttonOnClick(e)}>{buttonText}</Button>}
          {buttonRaw}
        </div>
      </div>
    </>
  );
}
