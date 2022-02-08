import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

export type ColorPickerProps = {
  defaultValue: string;
  onChange: (text: string) => void;
};

const ColorPicker = (props: ColorPickerProps) => {
  const [color, setColor] = useState(props.defaultValue);

  return (
    <>
      <HexColorPicker
        className="!w-32 !h-32"
        color={color}
        onChange={(val) => {
          setColor(val);
          props.onChange(val);
        }}
      />
      <HexColorInput
        className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-800 focus:border-neutral-800 sm:text-sm"
        color={color}
        onChange={(val) => {
          setColor(val);
          props.onChange(val);
        }}
        type="text"
      />
    </>
  );
};

export default ColorPicker;
