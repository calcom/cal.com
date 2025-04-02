"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Checkbox } from "@calcom/ui/components/form";

export const BasicExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col items-center justify-center gap-2">
        <Checkbox id="basic-unchecked" />
        <span className="text-subtle text-xs">Unchecked</span>
      </div>

      <div className="flex flex-col items-center justify-center gap-2">
        <Checkbox id="basic-checked" defaultChecked />
        <span className="text-subtle text-xs">Checked</span>
      </div>

      <div className="flex flex-col items-center justify-center gap-2">
        <Checkbox id="basic-disabled" disabled />
        <span className="text-subtle text-xs">Disabled</span>
      </div>

      <div className="flex flex-col items-center justify-center gap-2">
        <Checkbox id="basic-disabled-checked" disabled defaultChecked />
        <span className="text-subtle text-xs">Disabled Checked</span>
      </div>
    </div>
  </RenderComponentWithSnippet>
);
