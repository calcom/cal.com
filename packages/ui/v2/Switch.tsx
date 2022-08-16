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
    <div className="flex h-auto w-auto flex-row items-center">
      <PrimitiveSwitch.Root
        className={classNames(
          "relative m-2 h-6 w-10 rounded-full bg-gray-200",
          "[&:focus]:shadow-[0_0_0_2px_black]",
          "[&[data-state='checked']]:bg-black",
          "&[type='checkbox']:translate-0"
        )}
        {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          id={id}
          className={classNames(
            "block h-[18px] w-[18px] rounded-full bg-white",
            "translate-x-[4px] transition delay-100 will-change-transform",
            "[&[data-state='checked']]:translate-x-[18px]"
          )}
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
