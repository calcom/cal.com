"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Badge } from "@calcom/ui/components/badge";

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

export const VariantsExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-8">
      {variants.map((variant) => (
        <div key={variant} className="space-y-2">
          <h4 className="text-default text-sm capitalize">{variant}</h4>
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
        </div>
      ))}
    </div>
  </RenderComponentWithSnippet>
);
