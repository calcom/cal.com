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

export const IconsExample: React.FC = () => (
  <RenderComponentWithSnippet>
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
  </RenderComponentWithSnippet>
);
