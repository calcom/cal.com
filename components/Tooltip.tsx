import React from "react";
import T from "@components/T";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export function Tooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: {
  [x: string]: any;
  children: React.ReactNode;
  content: string;
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
        <T>{content}</T>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Root>
  );
}
