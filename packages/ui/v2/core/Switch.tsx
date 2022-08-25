import { useId } from "@radix-ui/react-id";
import * as Label from "@radix-ui/react-label";
import * as PrimitiveSwitch from "@radix-ui/react-switch";
import React from "react";

import classNames from "@calcom/lib/classNames";

const Switch = (
  props: React.ComponentProps<typeof PrimitiveSwitch.Root> & {
    label?: string;
  }
) => {
  const { label, ...primitiveProps } = props;
  const id = useId();

  return (
    <div className="flex h-[20px] items-center">
      <PrimitiveSwitch.Root
        className={classNames(
          props.checked ? "bg-gray-900" : "bg-gray-200 hover:bg-gray-300",
          "focus:ring-brand-800 h-[24px] w-[40px] rounded-full p-0.5 shadow-none focus:ring-1"
        )}
        {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          id={id}
          className="block h-[18px] w-[18px] translate-x-0 rounded-full bg-white transition-transform"
        />
      </PrimitiveSwitch.Root>
      {label && (
        <Label.Root
          htmlFor={id}
          className="ml-2 cursor-pointer align-text-top text-sm font-medium text-neutral-700 ltr:ml-3 rtl:mr-3 dark:text-white">
          {label}
        </Label.Root>
      )}
    </div>
  );
};

export default Switch;
