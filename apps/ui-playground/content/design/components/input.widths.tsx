"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Input } from "@calcom/ui/components/form";

const sizes = ["sm", "md"] as const;

export const WidthsExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-6">
      <div className="space-y-4">
        {sizes.map((size) => (
          <div key={size} className="flex flex-col space-y-2">
            <h3 className="text-emphasis text-sm">Size: {size}</h3>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <h4 className="text-subtle text-xs">Full Width</h4>
                <Input type="text" placeholder="Full width input" size={size} isFullWidth />
              </div>
              <div className="flex flex-col space-y-2">
                <h4 className="text-subtle text-xs">Auto Width</h4>
                <Input type="text" placeholder="Auto width input" size={size} isFullWidth={false} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </RenderComponentWithSnippet>
);
