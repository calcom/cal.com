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
    <div className="h-[20px] flex items-center">
      <PrimitiveSwitch.Root
        className={classNames(checked ? "bg-gray-900" : "bg-gray-400", "w-[36px] h-[20px] p-0.5 rounded-sm")}
        checked={checked}
        onCheckedChange={onPrimitiveCheckedChange}
        {...primitiveProps}>
        <PrimitiveSwitch.Thumb
          className={classNames(
            "w-[16px] h-[16px] block bg-white transition-transform",
            checked ? "translate-x-[16px]" : "translate-x-0"
          )}
        />
      </PrimitiveSwitch.Root>
      {label && (
        <Label.Root className="align-text-top ml-3 text-neutral-700 font-medium cursor-pointer">
          {label}
        </Label.Root>
      )}
    </div>
  );
}
