"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import classNames from "@calcom/ui/classNames";

const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={classNames("relative flex w-full touch-none select-none items-center", className)}
    {...props}>
    <SliderPrimitive.Track className="bg-subtle border-subtle relative h-2 w-full grow overflow-hidden rounded-full border">
      <SliderPrimitive.Range className="bg-brand-default absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="border-subtle bg-brand-default ring-offset-background focus-visible:ring-ring block h-4 w-4 rounded-full border-2 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    <SliderPrimitive.Thumb className="border-subtle bg-brand-default ring-offset-background focus-visible:ring-ring block h-4 w-4 rounded-full border-2 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
RangeSlider.displayName = SliderPrimitive.Root.displayName;

export { RangeSlider };
