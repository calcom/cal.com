"use client";

import { useState } from "react";

import { Button } from "@calcom/ui";

export default function ButtonDemo() {
  const [isOpen, setIsOpen] = useState(true);

  const variants = ["button", "icon", "fab"] as const;
  const colors = ["primary", "secondary", "minimal", "destructive"] as const;
  const sizes = ["sm", "base", "lg"] as const;

  return (
    <div className="border-subtle bg-default rounded-lg border p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-emphasis flex w-full items-center justify-between rounded-md py-2 text-lg font-semibold">
        <span>Button</span>
        <span className="text-subtle">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="space-y-8 pt-4">
          {/* Variants with Colors */}
          {variants.map((variant) => (
            <section key={variant} id={`button-${variant === "button" ? "default" : variant}`}>
              <h2 className="text-emphasis mb-4 text-lg font-semibold capitalize">
                {variant === "button" ? "Default" : variant}
              </h2>
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
                            {variant !== "icon" && `${color} ${size}`}
                          </Button>
                          <span className="text-subtle text-xs">{size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* With Icons */}
          <section id="button-icons">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">With Icons</h2>
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
          </section>

          {/* Loading State */}
          <section id="button-loading">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Loading State</h2>
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
          </section>

          {/* Disabled State */}
          <section id="button-disabled">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">Disabled State</h2>
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
          </section>

          {/* With Tooltip
          <section>
            <h2 className="mb-4 text-lg font-semibold">With Tooltip</h2>
            <div className="flex flex-wrap items-center gap-4">
              {colors.map((color) => (
                <div key={color} className="flex flex-col items-center gap-2">
                  <Button color={color} tooltip={`${color} button tooltip`}>
                    Hover me
                  </Button>
                  <span className="text-subtle text-xs">Tooltip</span>
                </div>
              ))}
            </div>
          </section> */}

          {/* As Link */}
          <section id="button-link">
            <h2 className="text-emphasis mb-4 text-lg font-semibold">As Link</h2>
            <div className="flex flex-wrap items-center gap-4">
              {colors.map((color) => (
                <div key={color} className="flex flex-col items-center gap-2">
                  <Button color={color} href="#" target="_blank">
                    {color} Link
                  </Button>
                  <span className="text-subtle text-xs">Link</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
