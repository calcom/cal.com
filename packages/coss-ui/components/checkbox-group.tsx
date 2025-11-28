"use client";

import { CheckboxGroup as CheckboxGroupPrimitive } from "components/checkbox-group";

import { cn } from "lib/utils";

function CheckboxGroup({ className, ...props }: CheckboxGroupPrimitive.Props) {
  return (
    <CheckboxGroupPrimitive
      className={cn("flex flex-col items-start gap-3", className)}
      {...props}
    />
  );
}

export { CheckboxGroup };
