import * as PopoverPrimitive from "@radix-ui/react-popover";
import React, { ComponentProps, forwardRef } from "react";

export const Popover = PopoverPrimitive.Root;

type PopoverTriggerProps = ComponentProps<typeof PopoverPrimitive["Trigger"]>;
export const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <PopoverPrimitive.Trigger
        {...props}
        className="slideInTop w-50 relative z-10 mt-1 -ml-0 origin-top-right rounded-sm bg-white text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        ref={forwardedRef}>
        {children}
      </PopoverPrimitive.Trigger>
    );
  }
);
PopoverTrigger.displayName = "PopoverTrigger";

type PopoverContentProps = ComponentProps<typeof PopoverPrimitive["Content"]>;
export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <PopoverPrimitive.Content
        collisionPadding={10}
        {...props}
        className="rounded-sm bg-black px-1 py-0.5 text-xs text-white shadow-lg"
        ref={forwardedRef}>
        {children}
      </PopoverPrimitive.Content>
    );
  }
);
PopoverContent.displayName = "PopoverContent";

export default Popover;
