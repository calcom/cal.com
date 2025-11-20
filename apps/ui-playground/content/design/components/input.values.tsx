"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Input } from "@calcom/ui/components/form";

const sizes = ["sm", "md"] as const;

export const ValuesExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-6">
      <div className="space-y-4">
        {sizes.map((size) => (
          <div key={size} className="flex flex-col space-y-2">
            <h3 className="text-emphasis text-sm">Size: {size}</h3>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <h4 className="text-subtle text-xs">Default Value</h4>
                <Input type="text" defaultValue="Default text value" size={size} />
              </div>
              <div className="flex flex-col space-y-2">
                <h4 className="text-subtle text-xs">Placeholder</h4>
                <Input type="text" placeholder="Placeholder text" size={size} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </RenderComponentWithSnippet>
);
