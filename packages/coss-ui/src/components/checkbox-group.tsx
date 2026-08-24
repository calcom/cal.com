"use client";

import { CheckboxGroup as CheckboxGroupPrimitive } from "@base-ui/react/checkbox-group";

import { cn } from "@coss/ui/lib/utils";

function CheckboxGroup({ className, ...props }: CheckboxGroupPrimitive.Props) {
  return <CheckboxGroupPrimitive className={cn("flex flex-col items-start gap-3", className)} {...props} />;
}

export { CheckboxGroup };
