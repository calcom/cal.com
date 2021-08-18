import { useState } from "react";
import * as PrimitiveSwitch from "@radix-ui/react-switch";
import * as Label from "@radix-ui/react-label";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Switch(props) {
  const { label, onCheckedChange, ...primitiveProps } = props;
  const [checked, setChecked] = useState(props.defaultChecked || false);

  const onPrimitiveCheckedChange = (change: boolean) => {
    if (onCheckedChange) {
      onCheckedChange(change);
    }
    setChecked(change);
  };

  return (
    <div className="flex items-center h-[20px]">
      <PrimitiveSwitch.Root
        className={classNames(checked ? "bg-gray-900" : "bg-gray-400", "rounded-sm w-[36px] p-0.5 h-[20px]")}
        checked={checked}
        onCheckedChange={onPrimitiveCheckedChange}
        {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          className={classNames(
            "bg-white w-[16px] h-[16px] block transition-transform",
            checked ? "translate-x-[16px]" : "translate-x-0"
          )}
        />
      </PrimitiveSwitch.Root>
      {label && (
        <Label.Root className="text-neutral-700 align-text-top ml-3 font-medium cursor-pointer">
          {label}
        </Label.Root>
      )}
    </div>
  );
}
