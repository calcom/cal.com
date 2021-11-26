import React from "react";

import { SVGComponent } from "@lib/types/SVGComponent";

export default function EmptyScreen({
  Icon,
  headline,
  description,
}: {
  Icon: SVGComponent;
  headline: string;
  description: string;
}) {
  return (
    <>
      <div className="flex flex-col items-center justify-center my-6 border border-dashed rounded-sm min-h-80 dark:border-gray-500">
        <div className="bg-white w-[72px] h-[72px] flex justify-center items-center rounded-full">
          <Icon className="inline-block w-10 h-10 bg-white" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="mt-6 mb-1 text-lg font-medium dark:text-gray-200">{headline}</h2>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </>
  );
}
