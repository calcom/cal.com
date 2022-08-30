import React, { ReactNode } from "react";
import { Icon } from "react-feather";
import { IconType } from "react-icons";

import { SVGComponent } from "@calcom/types/SVGComponent";

import Button from "./Button";

export default function EmptyScreen({
  Icon,
  headline,
  description,
  buttonText,
  buttonOnClick,
  buttonRaw,
}: {
  Icon: SVGComponent | Icon | IconType;
  headline: string;
  description: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  buttonRaw?: ReactNode; // Used incase you want to provide your own button.
}) {
  return (
    <>
      <div className="min-h-80 my-6 flex w-full flex-col items-center justify-center rounded-sm border border-dashed p-7 lg:p-20">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-200 dark:bg-white">
          <Icon className="inline-block h-10 w-10 text-white dark:bg-gray-900 dark:text-gray-600" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="text-semibold font-cal mt-6 text-xl dark:text-gray-300">{headline}</h2>
          <p className="line-clamp-2 mt-3 mb-8 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">
            {description}
          </p>
          {buttonOnClick && buttonText && <Button onClick={(e) => buttonOnClick(e)}>{buttonText}</Button>}
          {buttonRaw}
        </div>
      </div>
    </>
  );
}
