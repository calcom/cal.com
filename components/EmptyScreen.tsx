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
      <div className="min-h-80 border border-dashed rounded-sm flex justify-center items-center flex-col">
        <div className="bg-white w-[72px] h-[72px] flex justify-center items-center rounded-full">
          <Icon className="inline-block w-10 h-10 bg-white" />
        </div>
        <div className="max-w-[500px] text-center">
          <h2 className="font-cal text-xl leading-7 font-bold mt-6 mb-3">{headline}</h2>
          <p className="leading-6">{description}</p>
        </div>
      </div>
    </>
  );
}
