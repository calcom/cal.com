import React from 'react';
// import { styled } from '@stitches/react';
// import { violet, blackA } from '@radix-ui/colors';
import * as SliderPrimitive from '@radix-ui/react-slider';

const Slider = ({value, min, max, step, label, changeHandler}) => (
    <SliderPrimitive.Root 
    className="slider"
    defaultValue={value} 
    max={max}
    min={min} 
    step={step} 
    aria-label={label}
    // onValueChange={changeHandler}
    >
        <SliderPrimitive.Track className="slider-track">
            <SliderPrimitive.Range className="slider-range" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="slider-thumb" />
  </SliderPrimitive.Root>
);

export default Slider;

