/**
 *  @TODO: remove this file and use v2/Switch made
 * to replace it for the old one
 * */
import * as SwitchPrimitive from "@radix-ui/react-switch";

import classNames from "@calcom/lib/classNames";

interface ISwitchProps {
  id: string;
  defaultSelected: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Switch = (props: ISwitchProps) => {
  const { id, defaultSelected } = props;
  return (
    <SwitchPrimitive.Root
      id={id}
      defaultChecked={defaultSelected}
      className={classNames(
        "relative h-6 w-[40px] rounded-full bg-gray-200",
        "[&:focus]:shadow-[0_0_0_2px_black]",
        "[&[data-state='checked']]:bg-black"
      )}
      onCheckedChange={(checked) => props.onCheckedChange(checked)}>
      <SwitchPrimitive.Thumb
        className={classNames(
          "block h-[18px] w-[18px] rounded-full bg-white",
          "translate-x-[4px] transition delay-100 will-change-transform",
          "[&[data-state='checked']]:translate-x-[18px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
};

export { Switch };
