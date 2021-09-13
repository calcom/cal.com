import React from "react";
import { CheckIcon } from "@heroicons/react/outline";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

export const Checkbox = (props: {
  defaultChecked: boolean;
  cid: string;
  label: string;
  value: boolean;
  onCheckedChange: (val: boolean | string, ref: string) => void;
}) => {
  return (
    <div className="flex mb-2 align-center">
      <CheckboxPrimitive.Root
        className="w-5 h-5 bg-gray-100 rounded-md"
        defaultChecked={props.defaultChecked}
        // onCheckedChange={(checked) => console.log(checked)}
        onCheckedChange={(checked) => props.onCheckedChange(checked, props.cid)}
        id={props.cid}>
        <CheckboxPrimitive.Indicator>
          <CheckIcon className="w-5 h-5 text-white bg-black border-2 border-black rounded-md" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label className="pl-2 text-xs text-gray-700" htmlFor={props.cid}>
        {props.label}
      </label>
    </div>
  );
};

export default Checkbox;
