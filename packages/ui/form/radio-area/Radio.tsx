import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { ReactNode } from "react";

import classNames from "@calcom/lib/classNames";

export const Group = (props: RadioGroupPrimitive.RadioGroupProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Root {...props}>{props.children}</RadioGroupPrimitive.Root>
);
export const Radio = (props: RadioGroupPrimitive.RadioGroupItemProps & { children: ReactNode }) => (
  <RadioGroupPrimitive.Item
    {...props}
    className={classNames(
      "h-4  w-4 rounded-full border border-gray-300 hover:bg-gray-100 focus:ring-2 focus:ring-gray-900 "
    )}>
    {props.children}
  </RadioGroupPrimitive.Item>
);
export const Indicator = () => (
  <RadioGroupPrimitive.Indicator className="relative flex h-full w-full items-center justify-center rounded-full bg-black after:h-[6px] after:w-[6px] after:rounded-full after:bg-white after:content-['']"></RadioGroupPrimitive.Indicator>
);

export const Label = (props: JSX.IntrinsicElements["label"]) => (
  <label {...props} className="ml-2 text-sm font-medium leading-5 text-gray-900"></label>
);
