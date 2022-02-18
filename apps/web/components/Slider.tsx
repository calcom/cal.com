import * as SliderPrimitive from "@radix-ui/react-slider";
import React from "react";

const Slider = ({
  value,
  label,
  changeHandler,
  ...props
}: Omit<SliderPrimitive.SliderProps, "value"> & {
  value: number;
  label: string;
  changeHandler: (value: number) => void;
}) => (
  <SliderPrimitive.Root
    className="slider mt-2"
    value={[value]}
    aria-label={label}
    onValueChange={(value: number[]) => changeHandler(value[0] ?? value)}
    {...props}>
    <SliderPrimitive.Track className="slider-track">
      <SliderPrimitive.Range className="slider-range" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="slider-thumb" />
  </SliderPrimitive.Root>
);

export default Slider;
