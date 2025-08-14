import { cn } from "@calid/features/lib/cn";
import { Input, Label } from "@calid/features/ui";
import * as React from "react";

const TextField = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input"> & {
    label: string;
    addOnSuffix?: React.ReactNode;
  }
>(({ className, type, addOnSuffix, ...props }, ref) => {
  return (
    <div className={cn("flex flex-col", className)}>
      {props.label && (
        <Label className="text-default mb-2" htmlFor={props.id}>
          {props.label}
        </Label>
      )}
      <div className="flex flex-row">
        <Input ref={ref} type={type} className={cn("w-full", className)} {...props} />
        {addOnSuffix}
      </div>
    </div>
  );
});
TextField.displayName = "InputWithLabel";

export { TextField };
