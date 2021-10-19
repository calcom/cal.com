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
      <div className="min-h-80 border border-dashed rounded-sm flex justify-center items-center flex-col my-6">
        <div className="bg-white w-[72px] h-[72px] flex justify-center items-center rounded-full">
          <Icon className="inline-block w-10 h-10 bg-white" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="text-lg font-medium mt-6 mb-1">{headline}</h2>
          <p className="text-sm leading-6 text-gray-600">{description}</p>
        </div>
      </div>
    </>
  );
}
