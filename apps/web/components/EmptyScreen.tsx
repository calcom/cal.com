import React from "react";

import { SVGComponent } from "@lib/types/SVGComponent";

export default function EmptyScreen({
  Icon,
  headline,
  description,
}: {
  Icon: SVGComponent;
  headline: string;
  description: string | React.ReactElement;
}) {
  return (
    <>
      <div className="min-h-80 my-6 flex flex-col items-center justify-center rounded-sm border border-dashed">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-600 dark:bg-white">
          <Icon className="inline-block h-10 w-10 text-white dark:bg-white dark:text-gray-600" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="mt-6 mb-1 text-lg font-medium dark:text-gray-300">{headline}</h2>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{description}</p>
        </div>
      </div>
    </>
  );
}
