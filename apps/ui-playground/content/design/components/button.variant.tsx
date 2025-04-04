"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { Row } from "@/app/components/row";

import { Button } from "@calcom/ui/components/button";

const variants = ["button", "icon"] as const;
const colors = ["primary", "secondary", "minimal", "destructive"] as const;
const sizes = ["xs", "sm", "base", "lg"] as const;

export const VariantExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-8">
      {variants.map((variant) => (
        <div key={variant} className="space-y-6">
          <h3 className="text-default text-sm capitalize">{variant === "button" ? "Default" : variant}</h3>
          <div className="space-y-6">
            {colors.map((color) => (
              <div key={color} className="space-y-2">
                <h4 className="text-default text-sm capitalize">{color}</h4>
                <Row>
                  {sizes.map((size) => (
                    <div key={size} className="flex flex-col items-center gap-2">
                      <Button
                        variant={variant}
                        color={color}
                        size={size}
                        StartIcon={variant === "icon" ? "plus" : undefined}>
                        {variant !== "icon" && `Label`}
                      </Button>
                      <span className="text-subtle text-xs">{size}</span>
                    </div>
                  ))}
                </Row>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </RenderComponentWithSnippet>
);
