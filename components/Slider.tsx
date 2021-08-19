import React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

const Slider = ({ value, min, max, step, label, changeHandler }) => (
  <SliderPrimitive.Root
    className="slider mt-2"
    min={min}
    step={step}
    max={max}
    value={[value]}
    aria-label={label}
    onValueChange={changeHandler}>
    <SliderPrimitive.Track className="slider-track">
      <SliderPrimitive.Range className="slider-range" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="slider-thumb" />
  </SliderPrimitive.Root>
);

export default Slider;
