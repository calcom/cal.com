import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React from "react";

import { classNames } from "@calcom/lib";

export function Tooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  side = "top",
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <TooltipPrimitive.Root
      delayDuration={50}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={classNames(
            side === "top" && "-mt-7",
            side === "right" && "ml-2",
            "bg-inverted text-inverted relative rounded-md px-2 py-1 text-xs font-semibold shadow-lg"
          )}
          side={side}
          align="center"
          {...props}>
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export default Tooltip;
