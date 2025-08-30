"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { TextAreaField } from "@calcom/ui/components/form";

export const StatesExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4 md:w-80">
      <div className="space-y-2">
        <h3 className="text-emphasis text-sm">Default</h3>
        <TextAreaField name="default" placeholder="Default textarea..." />
      </div>

      <div className="space-y-2">
        <h3 className="text-emphasis text-sm">Disabled</h3>
        <TextAreaField name="disabled" placeholder="Disabled textarea..." disabled />
      </div>

      <div className="space-y-2">
        <h3 className="text-emphasis text-sm">Readonly</h3>
        <TextAreaField
          name="readonly"
          placeholder="Readonly textarea..."
          defaultValue="This is a readonly textarea"
          readOnly
        />
      </div>
    </div>
  </RenderComponentWithSnippet>
);
