import { cn } from "@calid/features/lib/cn";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

const TooltipProvider = ({
  children,
  delayDuration = 300,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) => <TooltipPrimitive.Provider delayDuration={delayDuration}>{children}</TooltipPrimitive.Provider>;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // Base styles with modern design tokens
      "z-50 overflow-hidden rounded-md bg-black px-2 py-1 text-xs font-medium text-white",
      "shadow-[0_20px_25px_-5px_rgb(0_0_0_/_0.1),_0_10px_10px_-5px_rgb(0_0_0_/_0.04)]",
      "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
      "data-[state=open]:duration-200",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      "data-[state=closed]:duration-150",
      "data-[side=top]:slide-in-from-bottom-2 data-[side=top]:origin-bottom",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=bottom]:origin-top",
      "data-[side=left]:slide-in-from-right-2 data-[side=left]:origin-right",
      "data-[side=right]:slide-in-from-left-2 data-[side=right]:origin-left",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
