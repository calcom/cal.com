import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React from "react";

import classNames from "@calcom/lib/classNames";

export function Tooltip({
  children,
  side,
  content,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  open?: boolean;
  side?: "top" | "right" | "bottom" | "left" | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <TooltipPrimitive.Root
      delayDuration={50}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Content
        className={classNames(
          side === "top" && "-mt-2",
          side === "right" && "ml-2",
          "rounded-sm bg-black px-1 py-0.5 text-xs text-white shadow-lg"
        )}
        side={side}
        align="center"
        {...props}>
        {content}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Root>
  );
}

export default Tooltip;
