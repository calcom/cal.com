import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React from "react";

export function Tooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <TooltipPrimitive.Root
      delayDuration={150}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Content
        className="bg-black text-xs -mt-2 text-white px-1 py-0.5 shadow-lg rounded-sm"
        side="top"
        align="center"
        {...props}>
        {content}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Root>
  );
}
