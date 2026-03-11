import { cn } from "@coss/ui/lib/utils";
import type * as React from "react";
import type { CSSProperties } from "react";

interface ItemLabelProps {
  colorLight?: string;
  colorDark?: string;
  className?: string;
}

export function ItemLabel({
  colorLight,
  colorDark,
  className,
}: ItemLabelProps): React.ReactElement | null {
  const hasColor = colorLight || colorDark;
  if (!hasColor) return null;

  const style = {
    "--label-color-dark": colorDark || "transparent",
    "--label-color-light": colorLight || "transparent",
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-4.5 start-2.5 in-[[data-draggable]:hover,[data-draggable]:has([data-slot=list-item-drag-handle]:focus-visible),[data-draggable][data-drag-overlay],[data-drag-release]]:top-10.5 w-[3px] rounded-full bg-(--label-color-light) not-in-data-drag-release:transition-[top] dark:bg-(--label-color-dark)",
        className,
      )}
      data-slot="item-label-color"
      style={style}
    />
  );
}
