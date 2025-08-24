"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { TextAreaField } from "@calcom/ui/components/form";

export const SizesExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4 md:w-80">
      <div className="space-y-2">
        <h3 className="text-emphasis text-sm">Default Height</h3>
        <TextAreaField name="default" placeholder="Default height textarea..." />
      </div>

      <div className="space-y-2">
        <h3 className="text-emphasis text-sm">Custom Height (6 rows)</h3>
        <TextAreaField name="Taller" placeholder="Taller textarea..." rows={6} />
      </div>

      <div className="space-y-2">
        <h3 className="text-emphasis text-sm">Auto-growing</h3>
        <TextAreaField
          name="grows"
          placeholder="This textarea grows with content..."
          className="min-h-[100px]"
        />
      </div>
    </div>
  </RenderComponentWithSnippet>
);
