import { useId } from "@radix-ui/react-id";
import * as Label from "@radix-ui/react-label";
import * as PrimitiveSwitch from "@radix-ui/react-switch";
import React from "react";

const Switch = (
  props: React.ComponentProps<typeof PrimitiveSwitch.Root> & {
    label?: string;
  }
) => {
  const { label, ...primitiveProps } = props;
  const id = useId();

  return (
    <div className="flex h-[20px] items-center">
      <PrimitiveSwitch.Root className="h-[20px] w-[36px] rounded-sm bg-gray-400 p-0.5" {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          id={id}
          className="block h-[16px] w-[16px] translate-x-0 bg-white transition-transform"
        />
      </PrimitiveSwitch.Root>
      {label && (
        <Label.Root
          htmlFor={id}
          className="cursor-pointer align-text-top text-sm font-medium text-neutral-700 ltr:ml-3 rtl:mr-3 dark:text-white">
          {label}
        </Label.Root>
      )}
    </div>
  );
};

export default Switch;
