"use client";

import { Input } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function InputDemo() {
  const states = ["default", "disabled", "readonly"] as const;
  const types = ["text", "email", "password", "number", "tel", "url", "search"] as const;
  const sizes = ["sm", "md"] as const;

  return (
    <DemoSection title="Input">
      {/* Basic States */}
      <DemoSubSection id="input-states" title="States">
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
      </DemoSubSection>

      {/* Input Types */}
      <DemoSubSection id="input-types" title="Types">
        <div className="space-y-6">
          <div className="space-y-4">
            {types.map((type) => (
              <div key={type} className="flex flex-col space-y-2">
                <h3 className="text-emphasis text-sm capitalize">{type}</h3>
                <div className="flex flex-wrap items-center gap-4">
                  {sizes.map((size) => (
                    <div key={size} className="flex flex-col items-center gap-2">
                      <Input
                        type={type}
                        placeholder={`Enter ${type}...`}
                        defaultValue={
                          type === "email"
                            ? "example@cal.com"
                            : type === "url"
                            ? "https://cal.com"
                            : type === "number"
                            ? "42"
                            : type === "tel"
                            ? "+1234567890"
                            : ""
                        }
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
      </DemoSubSection>

      {/* Sizes */}
      <DemoSubSection id="input-widths" title="Widths">
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
      </DemoSubSection>

      {/* With Default Values */}
      <DemoSubSection id="input-values" title="With Values">
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
      </DemoSubSection>
    </DemoSection>
  );
}
