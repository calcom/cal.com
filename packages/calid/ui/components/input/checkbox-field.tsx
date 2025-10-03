import { cn } from "@calid/features/lib/cn";
import { Icon } from "../icon";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as React from "react";

import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";

type CheckboxFieldProps = {
  label?: React.ReactNode;
  description?: string;
  descriptionAsLabel?: boolean;
  descriptionAsSafeHtml?: string;
  error?: boolean;
  disabled?: boolean;
  informationIconText?: string;
  className?: string;
  descriptionClassName?: string;
} & React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, onCheckedChange, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "border-primary ring-offset-background focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground peer h-4 w-4 shrink-0 rounded-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    onCheckedChange={(checked) => {
      if (onCheckedChange) {
        onCheckedChange(checked === true);
      }
    }}
    {...props}>
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Icon name="check" className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

const CheckboxField = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxFieldProps>(
  (
    { label, description, descriptionAsSafeHtml, error, disabled, className, descriptionClassName, ...props },
    ref
  ) => {
    const id = React.useId();
    const descriptionAsLabel = !label || props.descriptionAsLabel;

    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {label && (
          <div className="min-w-48">
            {descriptionAsLabel ? (
              <div className="text-emphasis flex text-sm font-medium">{label}</div>
            ) : (
              <label htmlFor={props.id ?? id} className="text-emphasis flex text-sm font-medium">
                {label}
              </label>
            )}
          </div>
        )}
        <div className="flex items-center">
          <Checkbox
            ref={ref}
            id={props.id ?? id}
            disabled={disabled}
            className={cn(
              error ? "border-error data-[state=checked]:bg-darkerror data-[state=checked]:text-error" : "",
              className
            )}
            {...props}
          />
          {descriptionAsSafeHtml ? (
            <span className={cn("text-default ml-2 text-sm", !label && "font-medium", descriptionClassName)}>
              {markdownToSafeHTML(descriptionAsSafeHtml)}
            </span>
          ) : (
            description && (
              <span
                className={cn("text-default ml-2 text-sm", !label && "font-medium", descriptionClassName)}>
                {description}
              </span>
            )
          )}
        </div>
      </div>
    );
  }
);
CheckboxField.displayName = "CheckboxField";

export { Checkbox, CheckboxField };
