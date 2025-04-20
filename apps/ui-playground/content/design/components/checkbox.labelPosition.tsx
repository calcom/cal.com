"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { CheckboxField } from "@calcom/ui/components/form";

export const LabelPositionExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4">
      <CheckboxField
        description="Description with label above (default on mobile)"
        id="label-above"
        label="Label Above"
      />
      <div className="sm:min-w-[400px]">
        <CheckboxField
          description="Description with label to the side (on larger screens)"
          id="label-side"
          label="Label to the Side"
        />
      </div>
    </div>
  </RenderComponentWithSnippet>
);
