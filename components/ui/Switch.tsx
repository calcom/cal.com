import { useState } from "react";
import * as PrimitiveSwitch from "@radix-ui/react-switch";
import * as Label from "@radix-ui/react-label";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Switch(props) {
  const { label, ...primitiveProps } = props;
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex items-center h-[20px]">
      <PrimitiveSwitch.Root
        className={classNames(checked ? "bg-gray-900" : "bg-gray-400", "rounded-sm w-[36px] p-0.5 h-[20px]")}
        id={primitiveProps.name}
        checked={checked}
        onCheckedChange={setChecked}
        {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          className={classNames(
            "bg-white w-[16px] h-[16px] block transition-transform",
            checked ? "translate-x-[16px]" : "translate-x-0"
          )}
        />
      </PrimitiveSwitch.Root>
      {label && (
        <Label.Root
          htmlFor={primitiveProps.name}
          className="text-neutral-700 align-text-top ml-3 font-medium cursor-pointer">
          {label}
        </Label.Root>
      )}
    </div>
  );
}
