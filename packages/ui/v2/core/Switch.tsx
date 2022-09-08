import { useId } from "@radix-ui/react-id";
import * as Label from "@radix-ui/react-label";
import * as PrimitiveSwitch from "@radix-ui/react-switch";
import React from "react";

import classNames from "@calcom/lib/classNames";

const Switch = (
  props: React.ComponentProps<typeof PrimitiveSwitch.Root> & {
    label?: string;
    thumbProps?: {
      className?: string;
    };
  }
) => {
  const { label, ...primitiveProps } = props;
  const id = useId();

  return (
    <div className="flex h-auto w-auto flex-row items-center">
      <PrimitiveSwitch.Root
        className={classNames(
          props.checked ? "bg-gray-900" : "bg-gray-200 hover:bg-gray-300",
          "focus:ring-brand-800 h-6 w-10 rounded-full shadow-none",
          props.className
        )}
        {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          id={id}
          // Since we dont support global dark mode - we have to style dark mode components specifically on the instance for now
          // TODO: Remove once we support global dark mode
          className={classNames(
            "block h-[18px] w-[18px] rounded-full bg-white",
            "translate-x-[4px] transition delay-100 will-change-transform",
            "[&[data-state='checked']]:translate-x-[18px]",
            props.checked && "shadow-inner",
            props.thumbProps?.className
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
