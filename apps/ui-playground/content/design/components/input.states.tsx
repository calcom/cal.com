"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Input } from "@calcom/ui/components/form";

const states = ["default", "disabled", "readonly"] as const;
const sizes = ["sm", "md"] as const;

export const StatesExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-6">
      <div className="space-y-4">
        {states.map((state) => (
          <div key={state} className="flex flex-col space-y-2">
            <h3 className="text-emphasis text-sm capitalize">{state}</h3>
            <div className="flex flex-wrap items-center gap-4">
              {sizes.map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <Input
                    type="text"
                    placeholder={`${state} input`}
                    disabled={state === "disabled"}
                    readOnly={state === "readonly"}
                    size={size}
                    isFullWidth={false}
                  />
                  <span className="text-subtle text-xs">{size}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </RenderComponentWithSnippet>
);
