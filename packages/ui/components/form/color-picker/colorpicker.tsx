import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import { fallBackHex, isValidHexCode } from "@calcom/lib/CustomBranding";

export type ColorPickerProps = {
  defaultValue: string;
  onChange: (text: string) => void;
  container?: HTMLElement;
  popoverAlign?: React.ComponentProps<typeof Popover.Content>["align"];
};

const ColorPicker = (props: ColorPickerProps) => {
  const init = !isValidHexCode(props.defaultValue)
    ? fallBackHex(props.defaultValue, false)
    : props.defaultValue;
  const [color, setColor] = useState(init);

  return (
    <div className="mt-1 flex h-[38px] items-center justify-center">
      <Popover.Root>
        <div className="flex h-full w-10 items-center items-center justify-center rounded-l-md border border-r-0 border-gray-300">
          <Popover.Trigger asChild>
            <button
              className="h-5 w-5 rounded-sm"
              aria-label="pick colors"
              style={{ backgroundColor: color }}
            />
          </Popover.Trigger>
        </div>
        <Popover.Portal container={props.container}>
          <Popover.Content align={props.popoverAlign ?? "center"} sideOffset={10}>
            <HexColorPicker
              color={color}
              className="!h-32 !w-32"
              onChange={(val) => {
                setColor(val);
                props.onChange(val);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <HexColorInput
        className="block h-full w-full border border-gray-300 px-3 py-2 ltr:rounded-r-md rtl:rounded-l-md sm:text-sm"
        color={color}
        onChange={(val) => {
          setColor(val);
          props.onChange(val);
        }}
        type="text"
      />
    </div>
  );
};

export default ColorPicker;
