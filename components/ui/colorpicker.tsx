import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import Swatch from "@components/Swatch";

export type ColorPickerProps = {
  defaultValue: string;
  onChange: (text: string) => void;
};

const ColorPicker = (props: ColorPickerProps) => {
  const [color, setColor] = useState(props.defaultValue);
  const [isOpen, toggle] = useState(false);

  return (
    <div className="relative flex items-center justify-center mt-1">
      <Swatch size="sm" backgroundColor={color} onClick={() => toggle(!isOpen)} />

      {isOpen && (
        <HexColorPicker
          className="!w-32 !h-32 !absolute !top-10 !left-0 !z-10"
          color={color}
          onChange={(val) => {
            setColor(val);
            props.onChange(val);
          }}
        />
      )}
      <HexColorInput
        className="block w-full px-3 py-2 ml-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-800 focus:border-neutral-800 sm:text-sm"
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
