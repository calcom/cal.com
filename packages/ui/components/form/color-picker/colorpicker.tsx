"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import { fallBackHex, isValidHexCode } from "@calcom/lib/getBrandColours";
import cx from "@calcom/ui/classNames";

import { Button } from "../../button/Button";

export type ColorPickerProps = {
  defaultValue: string;
  onChange: (text: string) => void;
  container?: HTMLElement;
  popoverAlign?: React.ComponentProps<typeof Popover.Content>["align"];
  className?: string;
  resetDefaultValue?: string;
};

const ColorPicker = (props: ColorPickerProps) => {
  const init = !isValidHexCode(props.defaultValue)
    ? fallBackHex(props.defaultValue, false)
    : props.defaultValue;
  const resetDefaultValue =
    props.resetDefaultValue &&
    (!isValidHexCode(props.resetDefaultValue)
      ? fallBackHex(props.resetDefaultValue, false)
      : props.resetDefaultValue);
  const [color, setColor] = useState(init);

  return (
    <div className="mt-1 flex h-[38px] items-center justify-center">
      <Popover.Root>
        <div className="border-default min-w-9 flex h-full items-center justify-center border ltr:rounded-l-md ltr:border-r-0 rtl:rounded-r-md rtl:border-l-0">
          <Popover.Trigger asChild>
            <button
              className="relative h-5 w-5 rounded-sm after:absolute after:inset-[-8px] after:content-['']"
              aria-label="pick colors"
              style={{ backgroundColor: color }}
            />
          </Popover.Trigger>
        </div>
        <Popover.Portal container={props.container}>
          <Popover.Content align={props.popoverAlign ?? "center"} sideOffset={10}>
            <HexColorPicker
              color={color}
              className="h-32! w-32!"
              onChange={(val) => {
                setColor(val);
                props.onChange(val);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <HexColorInput
        className={cx(
          "border-default text-default bg-default block h-full w-full border px-3 py-2 ltr:rounded-r-md rtl:rounded-l-md sm:text-sm",
          props.className
        )}
        color={color}
        onChange={(val) => {
          setColor(val);
          props.onChange(val);
        }}
        type="text"
      />
      {resetDefaultValue && color != resetDefaultValue && (
        <div className="px-1">
          <Button
            color="secondary"
            target="_blank"
            variant="icon"
            rel="noreferrer"
            aria-label="Reset to default"
            StartIcon="rotate-ccw"
            tooltip="Reset to default"
            onClick={() => {
              setColor(fallBackHex(resetDefaultValue, false));
              props.onChange(resetDefaultValue);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
