"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { CheckboxField } from "@calcom/ui/components/form";

export const DescriptionExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4">
      <CheckboxField description="This is a regular description" id="desc-normal" />
      <CheckboxField description="This description acts as the label" descriptionAsLabel id="desc-as-label" />
      <CheckboxField id="desc-long" label="Label and description" description="Label and description" />
    </div>
  </RenderComponentWithSnippet>
);
