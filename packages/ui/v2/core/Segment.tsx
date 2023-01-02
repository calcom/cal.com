import * as RadioGroup from "@radix-ui/react-radio-group";
import React from "react";

import { Label } from "../../components/form";

type SegmentProps = {
  label: string;
  children: React.ReactNode;
} & RadioGroup.RadioGroupProps;

export function Segment({ label, children, ...rest }: SegmentProps) {
  return (
    <div>
      <div className="inline-flex flex-col">
        {label && <Label>{label}</Label>}
        <RadioGroup.Root
          className="flex space-x-1 rounded-md border-gray-200 bg-white p-[2px] text-sm font-medium leading-5 "
          {...rest}>
          {children}
        </RadioGroup.Root>
      </div>
    </div>
  );
}

type SegmentOptionProps = { value: string; children: React.ReactNode } & RadioGroup.RadioGroupItemProps;
export function SegmentOption({ value, children, ...rest }: SegmentOptionProps) {
  return (
    <RadioGroup.Item
      value={value}
      className="radix-disabled:opacity-40 radix-state-checked:bg-gray-200 radix-state-checked:hover:bg-gray-200 rounded-[4px] py-[6px] px-3 hover:bg-gray-100"
      {...rest}>
      {children}
    </RadioGroup.Item>
  );
}
