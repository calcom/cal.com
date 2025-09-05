"use client";

import { CheckboxField } from "@calcom/ui/components/form";
import { RenderComponentWithSnippet } from "@/app/components/render";

export const InfoIconExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <CheckboxField
      description="Checkbox with additional information"
      id="info-icon"
      label="Information Icon"
      informationIconText="This is additional information that appears in a tooltip"
    />
  </RenderComponentWithSnippet>
);
