"use client";

import { Form as FormPrimitive } from "@base-ui/react/form";

import { cn } from "@coss/ui/lib/utils";

function Form({ className, ...props }: FormPrimitive.Props) {
  return (
    <FormPrimitive
      className={cn("flex w-full flex-col gap-4", className)}
      data-slot="form"
      {...props}
    />
  );
}

export { Form };
