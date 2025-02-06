"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

export const HeadingsExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4">
      <h1 className="text-emphasis font-cal text-3xl">Heading 1 (text-3xl)</h1>
      <h2 className="text-emphasis font-cal text-2xl">Heading 2 (text-2xl)</h2>
      <h3 className="text-emphasis font-cal text-xl">Heading 3 (text-xl)</h3>
      <h4 className="text-emphasis font-cal text-lg">Heading 4 (text-lg)</h4>
      <h5 className="text-emphasis font-cal text-base">Heading 5 (text-base)</h5>
      <h6 className="text-emphasis font-cal text-sm">Heading 6 (text-sm)</h6>
    </div>
  </RenderComponentWithSnippet>
);
