import { cn } from "@calid/features/lib/cn";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = ({
  children,
  content,
  sideOffset = 4,
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  sideOffset?: number;
} & React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border bg-black px-3 py-1.5 text-xs text-white shadow-md"
      )}
      {...props}>
      {content}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Root>
);

export { Tooltip, TooltipProvider };
