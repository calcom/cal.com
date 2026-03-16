import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";
import React from "react";

import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";

export const Root = RadioGroupPrimitive.Root;

export const Group = (props: RadioGroupPrimitive.RadioGroupProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Root {...props}>{props.children}</RadioGroupPrimitive.Root>
);
export const Radio = (props: RadioGroupPrimitive.RadioGroupItemProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Item
    {...props}
    className={classNames(
      "hover:bg-subtle border-default dark:checked:bg-brand-default dark:hover:bg-subtle dark:checked:hover:bg-brand-default focus:ring-brand-default hover:border-emphasis me-1.5 mt-0.5 flex-shrink-0 border text-[--cal-brand] transition focus:border-0 focus:ring-1",
      props.disabled && "opacity-60",
      props.className
    )}>
    {props.children}
  </RadioGroupPrimitive.Item>
);
export const Indicator = ({
  disabled,
  accentColor,
  variant = "default",
}: {
  disabled?: boolean;
  accentColor?: string;
  variant?: "default" | "largeSquare";
}) => (
  <RadioGroupPrimitive.Indicator
    className={classNames(
      "relative flex h-full w-full items-center justify-center",
      variant === "largeSquare" ? "" : "rounded-full",
      disabled
        ? "text-muted"
        : accentColor
        ? variant === "default"
          ? "bg-[var(--cal-radio-accent)]"
          : "text-[var(--cal-radio-accent)]"
        : "text-brand"
    )}
    style={accentColor ? { ["--cal-radio-accent" as string]: accentColor } : undefined}>
    {variant === "largeSquare" ? (
      <Icon name="check" className="h-3.5 w-3.5" />
    ) : (
      <span className="h-[6px] w-[6px] rounded-full bg-primary" />
    )}
  </RadioGroupPrimitive.Indicator>
);

export const Label = (props: JSX.IntrinsicElements["label"] & { disabled?: boolean }) => (
  <label
    {...props}
    className={classNames(
      "text-default ms-2 w-full text-sm font-medium leading-5",
      props.disabled && "text-subtle"
    )}
  />
);

export const RadioField = ({
  label,
  disabled,
  id,
  value,
  className,
  withPadding,
  accentColor,
  variant = "default",
}: {
  label: string | ReactNode;
  disabled?: boolean;
  id: string;
  value: string;
  className?: string;
  withPadding?: boolean;
  accentColor?: string;
  variant?: "default" | "largeSquare";
}) => (
  <div
    className={classNames(
      "flex items-start",
      withPadding && "hover:bg-subtle cursor-pointer rounded-lg p-1.5",
      className
    )}>
    <Radio
      value={value}
      disabled={disabled}
      id={id}
      className={classNames(
        variant === "largeSquare" ? "h-5 w-5" : "h-4 w-4 rounded-full",
        accentColor ? "data-[state=checked]:bg-transparent" : undefined
      )}>
      <Indicator disabled={disabled} accentColor={accentColor} variant={variant} />
    </Radio>
    <Label htmlFor={id} disabled={disabled}>
      {label}
    </Label>
  </div>
);
