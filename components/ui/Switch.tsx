import { useId } from "@radix-ui/react-id";
import * as Label from "@radix-ui/react-label";
import * as PrimitiveSwitch from "@radix-ui/react-switch";
import React, { useState } from "react";

import classNames from "@lib/classNames";

type SwitchProps = React.ComponentProps<typeof PrimitiveSwitch.Root> & {
  label: string;
};
export default function Switch(props: SwitchProps) {
  const { label, onCheckedChange, ...primitiveProps } = props;
  const [checked, setChecked] = useState(props.defaultChecked || false);

  const onPrimitiveCheckedChange = (change: boolean) => {
    if (onCheckedChange) {
      onCheckedChange(change);
    }
    setChecked(change);
  };
  const id = useId();
  return (
    <div className="flex items-center h-[20px]">
      <PrimitiveSwitch.Root
        className={classNames(checked ? "bg-gray-900" : "bg-gray-400", "rounded-sm w-[36px] p-0.5 h-[20px]")}
        checked={checked}
        onCheckedChange={onPrimitiveCheckedChange}
        {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          id={id}
          className={classNames(
            "bg-white w-[16px] h-[16px] block transition-transform",
            checked ? "translate-x-[16px]" : "translate-x-0"
          )}
        />
      </PrimitiveSwitch.Root>
      {label && (
        <Label.Root
          htmlFor={id}
          className="text-neutral-700 text-sm align-text-top ml-3 font-medium cursor-pointer">
          {label}
        </Label.Root>
      )}
    </div>
  );
}
