"use client";

import { useState } from "react";

import { Badge } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function BadgeDemo() {
  const [isOpen, setIsOpen] = useState(true);

  const variants = [
    "default",
    "warning",
    "orange",
    "success",
    "green",
    "gray",
    "blue",
    "red",
    "error",
    "grayWithoutHover",
  ] as const;

  const sizes = ["sm", "md", "lg"] as const;

  return (
    <div className="border-subtle bg-default text-default rounded-lg border p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md py-2 text-lg font-semibold">
        <span>Badge</span>
        <span className="text-subtle">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <DemoSection title="Badge" className="space-y-8 pt-4">
          {/* Variants with Sizes */}
          {variants.map((variant) => (
            <DemoSubSection key={variant} id={`badge-${variant}`} title={variant}>
              <div className="flex items-center gap-4">
                {sizes.map((size) => (
                  <div key={size} className="flex flex-col items-center gap-2">
                    <Badge variant={variant} size={size}>
                      {variant}
                    </Badge>
                    <span className="text-subtle text-xs">{size}</span>
                  </div>
                ))}
              </div>
            </DemoSubSection>
          ))}

          {/* With Icons */}
          <DemoSubSection id="badge-icons" title="With Icons">
            <div className="flex flex-wrap items-center gap-4">
              {variants.map((variant) => (
                <div key={variant} className="flex flex-col items-center gap-2">
                  <Badge variant={variant} startIcon="bell">
                    {variant}
                  </Badge>
                  <span className="text-subtle text-xs">Icon</span>
                </div>
              ))}
            </div>
          </DemoSubSection>

          {/* With Dots */}
          <DemoSubSection id="badge-dots" title="With Dots">
            <div className="flex flex-wrap items-center gap-4">
              {variants.map((variant) => (
                <div key={variant} className="flex flex-col items-center gap-2">
                  <Badge variant={variant} withDot>
                    {variant}
                  </Badge>
                  <span className="text-subtle text-xs">Dot</span>
                </div>
              ))}
            </div>
          </DemoSubSection>

          {/* Interactive */}
          <DemoSubSection id="badge-interactive" title="Interactive">
            <div className="flex flex-wrap items-center gap-4">
              {variants.map((variant) => (
                <div key={variant} className="flex flex-col items-center gap-2">
                  <Badge variant={variant} onClick={() => alert(`${variant} badge clicked!`)}>
                    Click me
                  </Badge>
                  <span className="text-subtle text-xs">Clickable</span>
                </div>
              ))}
            </div>
          </DemoSubSection>

          {/* Rounded */}
          <DemoSubSection id="badge-rounded" title="Rounded">
            <div className="flex flex-wrap items-center gap-4">
              {variants.map((variant) => (
                <div key={variant} className="flex flex-col items-center gap-2">
                  <Badge variant={variant} rounded>
                    1
                  </Badge>
                  <span className="text-subtle text-xs">{variant}</span>
                </div>
              ))}
            </div>
          </DemoSubSection>
        </DemoSection>
      )}
    </div>
  );
}
