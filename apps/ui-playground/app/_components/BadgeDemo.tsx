"use client";

import { useState } from "react";

import { Badge } from "@calcom/ui";

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
        <div className="space-y-8 pt-4">
          {/* Variants with Sizes */}
          {variants.map((variant) => (
            <section key={variant}>
              <h2 className="text-emphasis mb-4 text-lg font-semibold capitalize">{variant}</h2>
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
            </section>
          ))}

          {/* With Icons */}
          <section>
            <h2 className="text-emphasis mb-4 text-lg font-semibold">With Icons</h2>
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
          </section>

          {/* With Dots */}
          <section>
            <h2 className="text-emphasis mb-4 text-lg font-semibold">With Dots</h2>
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
          </section>

          {/* Interactive */}
          <section>
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Interactive</h2>
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
          </section>

          {/* Rounded */}
          <section>
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Rounded</h2>
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
          </section>
        </div>
      )}
    </div>
  );
}
