import React, { ReactNode } from "react";
import { Icon as FeatherIcon } from "react-feather";

import { SVGComponent } from "@calcom/types/SVGComponent";
import { Icon } from "@calcom/ui/Icon";
import { Button } from "@calcom/ui/v2";

export default function EmptyScreen({
  IconHeading,
  headline,
  description,
  buttonText,
  buttonOnClick,
}: {
  IconHeading: SVGComponent | FeatherIcon;
  headline: string;
  description: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}) {
  return (
    <>
      <div className="min-h-80 flex w-full flex-col items-center justify-center rounded-sm ">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-200 dark:bg-white">
          <IconHeading className="inline-block h-10 w-10 stroke-[1.3px] dark:bg-gray-900 dark:text-gray-600" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="text-semibold font-cal mt-6 text-xl dark:text-gray-300">{headline}</h2>
          <p className="line-clamp-2 mt-3 mb-8 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">
            {description}
          </p>
          {buttonOnClick && buttonText && (
            <Button StartIcon={Icon.FiPlus} onClick={(e) => buttonOnClick(e)}>
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
