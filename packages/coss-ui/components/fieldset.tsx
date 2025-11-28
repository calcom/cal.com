"use client";

import { Fieldset as FieldsetPrimitive } from "@base-ui-components/react/fieldset";

import { cn } from "@/lib/utils";

function Fieldset({ className, ...props }: FieldsetPrimitive.Root.Props) {
  return (
    <FieldsetPrimitive.Root
      className={cn("flex w-full max-w-64 flex-col gap-6", className)}
      data-slot="fieldset"
      {...props}
    />
  );
}
function FieldsetLegend({
  className,
  ...props
}: FieldsetPrimitive.Legend.Props) {
  return (
    <FieldsetPrimitive.Legend
      className={cn("font-semibold", className)}
      data-slot="fieldset-legend"
      {...props}
    />
  );
}

export { Fieldset, FieldsetLegend };
