import { cn } from "@calid/features/lib/cn";
import { Icon } from "@calid/features/ui/components/icon/Icon";



import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import React from "react";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "border-default peer h-4 w-4 shrink-0 rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
      // checked state → fill background with active color
      "data-[state=checked]:bg-active",
      className
    )}
    {...props}>
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center")}>
      {/* white checkmark inside active background */}
      <Icon name="check" className="text-active h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
