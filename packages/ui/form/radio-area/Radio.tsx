import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";
import React from "react";

import classNames from "@calcom/lib/classNames";

export const Group = (props: RadioGroupPrimitive.RadioGroupProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Root {...props}>{props.children}</RadioGroupPrimitive.Root>
);
export const Radio = (props: RadioGroupPrimitive.RadioGroupItemProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Item
    {...props}
    className={classNames(
      "hover:bg-subtle border-default dark:checked:bg-brand-default dark:bg-darkgray-100 dark:hover:bg-subtle dark:checked:hover:bg-brand-default focus:ring-brand-default hover:border-emphasis me-1.5 mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border text-[--cal-brand] focus:border-0 focus:ring-1",
      props.disabled && "opacity-60"
    )}>
    {props.children}
  </RadioGroupPrimitive.Item>
);
export const Indicator = ({ disabled }: { disabled?: boolean }) => (
  <RadioGroupPrimitive.Indicator
    className={classNames(
      "after:bg-default dark:after:bg-brand-accent relative flex h-full w-full items-center justify-center rounded-full bg-black after:h-[6px] after:w-[6px] after:rounded-full after:content-['']",
      disabled ? "after:bg-muted" : "bg-brand-default"
    )}
  />
);

export const Label = (props: JSX.IntrinsicElements["label"] & { disabled?: boolean }) => (
  <label
    {...props}
    className={classNames(
      "text-emphasis ms-2 w-full text-sm font-medium leading-5",
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
}: {
  label: string | ReactNode;
  disabled?: boolean;
  id: string;
  value: string;
  className?: string;
}) => (
  <div className={classNames("flex items-start", className)}>
    <Radio value={value} disabled={disabled} id={id}>
      <Indicator disabled={disabled} />
    </Radio>
    <Label htmlFor={id} disabled={disabled}>
      {label}
    </Label>
  </div>
);
