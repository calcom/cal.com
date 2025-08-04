import { cn } from "@calid/features/lib/cn";
import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  trailing?: React.ReactNode;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, trailing, ...props }, ref) => {
    return (
      <div
        className={cn(
          "border-input bg-background ring-offset-background focus-within:ring-ring relative flex w-full rounded-md border focus-within:ring-2 focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}>
        <textarea
          className={cn(
            "placeholder:text-muted-foreground flex min-h-[80px] w-full resize-none rounded-md border-0 bg-transparent px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            trailing && "pr-10" // add right padding if trailing
          )}
          ref={ref}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
