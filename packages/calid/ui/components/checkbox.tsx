import { cn } from "@calid/features/lib/cn";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as React from "react";

import { Icon } from "@calcom/ui/components/icon";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "data-[state=checked]:cal-bg-active border-active peer h-4 w-4 shrink-0 rounded-[4px] border disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:text-white",
      className
    )}
    {...props}>
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Icon name="check" className="h-3 w-3 text-white" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
