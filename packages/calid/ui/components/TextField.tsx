import { cn } from "@calid/features/lib/cn";
import * as React from "react";

export type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  trailing?: React.ReactNode;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>, parsedValue: string | number) => void;
};

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, trailing, type = "text", onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e, e.target.value);
      }
    };

    return (
      <div
        className={cn(
          "bg-background ring-offset-background focus-within:ring-ring relative flex w-full items-center rounded-md border focus-within:ring-2 focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}>
        <input
          type={type}
          className={cn(
            "placeholder:text-muted-foreground flex h-9 w-full border-none bg-transparent px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          )}
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        {trailing && <div className="flex">{trailing}</div>}
      </div>
    );
  }
);

TextField.displayName = "TextField";

export { TextField };
