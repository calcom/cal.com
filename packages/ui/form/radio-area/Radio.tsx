import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";

import classNames from "@calcom/lib/classNames";

export const Group = (props: RadioGroupPrimitive.RadioGroupProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Root {...props}>{props.children}</RadioGroupPrimitive.Root>
);
export const Radio = (props: RadioGroupPrimitive.RadioGroupItemProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Item
    {...props}
    className={classNames(
      "hover:bg-subtle border-default mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border focus:ring-2 focus:ring-gray-900",
      props.disabled && "opacity-60"
    )}>
    {props.children}
  </RadioGroupPrimitive.Item>
);
export const Indicator = ({ disabled }: { disabled?: boolean }) => (
  <RadioGroupPrimitive.Indicator
    className={classNames(
      "after:bg-default relative flex h-full w-full items-center justify-center rounded-full bg-black after:h-[6px] after:w-[6px] after:rounded-full after:content-['']",
      disabled ? "after:bg-muted0" : "bg-black"
    )}
  />
);

export const Label = (props: JSX.IntrinsicElements["label"] & { disabled?: boolean }) => (
  <label
    {...props}
    className={classNames(
      "text-emphasis dark:text-inverted text-sm font-medium leading-5 ltr:ml-2 rtl:mr-2",
      props.disabled && "text-subtle"
    )}
  />
);

export const RadioField = ({
  label,
  disabled,
  id,
  value,
}: {
  label: string;
  disabled?: boolean;
  id: string;
  value: string;
}) => (
  <div className="flex items-start">
    <Radio value={value} disabled={disabled} id={id}>
      <Indicator disabled={disabled} />
    </Radio>
    <Label htmlFor={id} disabled={disabled}>
      {label}
    </Label>
  </div>
);
