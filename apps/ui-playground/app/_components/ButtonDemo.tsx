"use client";

import { Button, SplitButton } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function ButtonDemo() {
  const variants = ["button", "icon"] as const;
  const colors = ["primary", "secondary", "minimal", "destructive"] as const;
  const sizes = ["xs", "sm", "base", "lg"] as const;

  return (
    <DemoSection title="Button">
      {/* Variants with Colors */}
      {variants.map((variant) => (
        <DemoSubSection
          key={variant}
          id={`button-${variant === "button" ? "default" : variant}`}
          title={variant === "button" ? "Default" : variant}>
          <div className="space-y-6">
            {colors.map((color) => (
              <div key={color} className="space-y-2">
                <h3 className="text-default text-sm capitalize">{color}</h3>
                <div className="flex flex-wrap items-center gap-4">
                  {sizes.map((size) => (
                    <div key={size} className="flex flex-col items-center gap-2">
                      <Button
                        variant={variant}
                        color={color}
                        size={size}
                        StartIcon={variant === "icon" ? "plus" : undefined}>
                        {variant !== "icon" && `label`}
                      </Button>
                      <span className="text-subtle text-xs">{size}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DemoSubSection>
      ))}

      {/* With Icons */}
      <DemoSubSection id="button-icons" title="With Icons">
        <div className="flex flex-wrap items-center gap-4">
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} StartIcon="calendar">
                {color}
              </Button>
              <span className="text-subtle text-xs">Start Icon</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} EndIcon="chevron-right">
                {color}
              </Button>
              <span className="text-subtle text-xs">End Icon</span>
            </div>
          ))}
        </div>
      </DemoSubSection>

      {/* Loading State */}
      <DemoSubSection id="button-loading" title="Loading State">
        <div className="flex flex-wrap items-center gap-4">
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} loading>
                {color}
              </Button>
              <span className="text-subtle text-xs">Loading</span>
            </div>
          ))}
        </div>
      </DemoSubSection>

      {/* Disabled State */}
      <DemoSubSection id="button-disabled" title="Disabled State">
        <div className="flex flex-wrap items-center gap-4">
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} disabled>
                {color}
              </Button>
              <span className="text-subtle text-xs">Disabled</span>
            </div>
          ))}
        </div>
      </DemoSubSection>

      {/* As Link */}
      <DemoSubSection id="button-link" title="As Link">
        <div className="flex flex-wrap items-center gap-4">
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} href="https://cal.com" target="_blank">
                {color}
              </Button>
              <span className="text-subtle text-xs">Link</span>
            </div>
          ))}
        </div>
      </DemoSubSection>

      {/* Split Button */}
      <DemoSubSection id="split-button" title="Split Button">
        <div className="flex flex-wrap items-center gap-4">
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <SplitButton
                color={color}
                StartIcon="plus"
                onClick={() => alert("Main action clicked")}
                dropdown={{
                  items: [
                    {
                      label: "Create New",
                      action: () => alert("Create New clicked"),
                      icon: "plus",
                    },
                    {
                      label: "Import",
                      action: () => alert("Import clicked"),
                      icon: "download",
                    },
                    {
                      label: "Delete",
                      action: () => alert("Delete clicked"),
                      icon: "trash",
                      color: "destructive",
                    },
                  ],
                }}>
                Create
              </SplitButton>
              <span className="text-subtle text-xs capitalize">{color}</span>
            </div>
          ))}
        </div>

        {/* Split Button Sizes */}
        <div className="mt-8 space-y-2">
          <h3 className="text-default text-sm">Sizes</h3>
          <div className="flex flex-wrap items-center gap-4">
            {sizes.map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <SplitButton
                  color="primary"
                  size={size}
                  StartIcon="calendar"
                  onClick={() => alert("Main action clicked")}
                  dropdown={{
                    items: [
                      {
                        label: "Schedule",
                        action: () => alert("Schedule clicked"),
                        icon: "calendar",
                      },
                      {
                        label: "Reschedule",
                        action: () => alert("Reschedule clicked"),
                        icon: "clock",
                      },
                    ],
                  }}>
                  Schedule
                </SplitButton>
                <span className="text-subtle text-xs">{size}</span>
              </div>
            ))}
          </div>
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
