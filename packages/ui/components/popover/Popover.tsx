import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import classNames from "@calcom/ui/classNames";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = function PopoverContent({
  ref: forwardedRef,
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
  ref: React.RefObject<React.ElementRef<typeof PopoverPrimitive.Content>>;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={forwardedRef}
        align={align}
        sideOffset={sideOffset}
        className={classNames(
          "bg-default text-emphasis z-50 w-72 rounded-md border p-4 outline-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
};

PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
