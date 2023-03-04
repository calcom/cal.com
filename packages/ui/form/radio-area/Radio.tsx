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
      "h-4  w-4 rounded-full border border-gray-300 hover:bg-gray-100 focus:ring-2 focus:ring-gray-900",
      props.disabled && "opacity-60"
    )}>
    {props.children}
  </RadioGroupPrimitive.Item>
);
export const Indicator = ({ disabled }: { disabled?: boolean }) => (
  <RadioGroupPrimitive.Indicator
    className={classNames(
      "relative flex h-full w-full items-center justify-center rounded-full bg-black after:h-[6px] after:w-[6px] after:rounded-full after:bg-white after:content-['']",
      disabled ? "after:bg-gray-500" : "bg-black"
    )}
  />
);

export const Label = (props: JSX.IntrinsicElements["label"] & { disabled?: boolean }) => (
  <label
    {...props}
    className={classNames(
      "ml-2 text-sm font-medium leading-5 text-gray-900 dark:text-white",
      props.disabled && "text-gray-500"
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
  <div className="flex items-center">
    <Radio value={value} disabled={disabled} id={id}>
      <Indicator disabled={disabled} />
    </Radio>
    <Label htmlFor={id} disabled={disabled}>
      {label}
    </Label>
  </div>
);
