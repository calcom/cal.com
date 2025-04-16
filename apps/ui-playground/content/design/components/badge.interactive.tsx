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

export const InteractiveExample: React.FC = () => (
  <RenderComponentWithSnippet>
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
  </RenderComponentWithSnippet>
);
