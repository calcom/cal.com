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
    <div className="flex h-[20px] items-center">
      <PrimitiveSwitch.Root
        className={classNames(checked ? "bg-gray-900" : "bg-gray-400", "h-[20px] w-[36px] rounded-sm p-0.5")}
        checked={checked}
        onCheckedChange={onPrimitiveCheckedChange}
        {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          id={id}
          className={classNames(
            "block h-[16px] w-[16px] bg-white transition-transform",
            checked ? "translate-x-[16px]" : "translate-x-0"
          )}
        />
      </PrimitiveSwitch.Root>
      {label && (
        <Label.Root
          htmlFor={id}
          className="cursor-pointer align-text-top text-sm font-medium text-neutral-700 ltr:ml-3 rtl:mr-3">
          {label}
        </Label.Root>
      )}
    </div>
  );
}
