import { cn } from "@calid/features/lib/cn";
import { Input, Label } from "@calid/features/ui";
import * as React from "react";

type TextFieldProps = {
  label: string;
  addOnSuffix?: React.ReactNode;
  inputPrefixWidget?: React.ReactNode;
};

const TextField = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input"> & TextFieldProps
>(({ className, type, inputPrefixWidget, addOnSuffix, ...props }, ref) => {
  return (
    <div className={cn("flex flex-col", className)}>
      {props.label && (
        <Label className="text-default mb-2" htmlFor={props.id}>
          {props.label}
        </Label>
      )}
      <div className="flex flex-row items-center">
        {inputPrefixWidget}
        <Input
          ref={ref}
          type={type}
          className={cn("w-full", className, inputPrefixWidget ? "border-l-none rounded-l-none" : "")}
          {...props}
        />
        {addOnSuffix}
      </div>
    </div>
  );
});
TextField.displayName = "InputWithLabel";

export { TextField };
export type { TextFieldProps };
