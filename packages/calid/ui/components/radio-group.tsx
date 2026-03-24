import { cn } from "@calid/features/lib/cn";
import { Icon } from "@calid/features/ui/components/icon";
import { Label } from "@calid/features/ui/components/label";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as React from "react";

import { SecondaryEmailModel } from "@calcom/prisma/zod";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

type RadioVariant = "default" | "largeSquare";

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    variant?: RadioVariant;
    accentColor?: string;
    secondaryColor?: string;
  }
>(({ className, variant = "default", accentColor, secondaryColor, ...props }, ref) => {

  const isLargeSquare = variant === "largeSquare";
  const { style, ...rest } = props;
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "border-primary text-primary ring-offset-background focus-visible:ring-ring peer aspect-square flex-shrink-0 border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isLargeSquare ? "h-5 w-5" : "h-4 w-4 rounded-full",
        className
      )}
      style={{
        ...(accentColor ? { ...(style ?? {}), ["--cal-radio-accent" as string]: accentColor } : style),
        ...(secondaryColor ? { borderColor: secondaryColor } : {}),
      }}
      {...rest}>
      <RadioGroupPrimitive.Indicator
        className={cn(
          "flex items-center justify-center",
          !isLargeSquare && "rounded-full",
          accentColor ? "text-[var(--cal-radio-accent)]" : isLargeSquare ? "text-primary" : "text-active"
        )}>
        {isLargeSquare ? (
          <Icon name="check" className="h-3.5 w-3.5 stroke-current" />
        ) : (
          <Icon name="circle" className="h-2.5 w-2.5 fill-current" />
        )}
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

const RadioField = ({
  label,
  disabled,
  id,
  value,
  className,
  withPadding,
  accentColor,
  secondaryColor,
  variant = "default",
}: {
  label: React.ReactNode;
  disabled?: boolean;
  id: string;
  value: string;
  className?: string;
  withPadding?: boolean;
  accentColor?: string;
  secondaryColor?: string;
  variant?: RadioVariant;
}) => (
  <div
    className={cn(
      "flex items-start",
      withPadding && "hover:bg-subtle cursor-pointer rounded-lg p-1.5",
      className
    )}>
    <RadioGroupItem
      value={value}
      disabled={disabled}
      id={id}
      variant={variant}
      accentColor={accentColor}
      secondaryColor={secondaryColor}
    />
    <Label htmlFor={id} className={cn("ms-2 w-full leading-5", disabled && "text-subtle")}>
      {label}
    </Label>
  </div>
);

export { RadioGroup, RadioGroupItem, RadioField };
