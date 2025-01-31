"use client";

import { useState } from "react";

import { RangeSlider } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function RangeSliderDemo() {
  const [singleValue, setSingleValue] = useState([50]);
  const [rangeValue, setRangeValue] = useState([20, 80]);
  const [steppedValue, setSteppedValue] = useState([25]);

  return (
    <DemoSection title="Range Slider">
      {/* Basic Slider */}
      <DemoSubSection id="slider-basic" title="Basic">
        <div className="w-full max-w-[300px] space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-default text-sm">Single Value: {singleValue[0]}%</span>
            </div>
            <RangeSlider
              value={singleValue}
              onValueChange={setSingleValue}
              max={100}
              step={1}
              aria-label="Single value"
            />
          </div>
        </div>
      </DemoSubSection>

      {/* Range Slider */}
      <DemoSubSection id="slider-range" title="Range">
        <div className="w-full max-w-[300px] space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-default text-sm">
                Range: {rangeValue[0]}% - {rangeValue[1]}%
              </span>
            </div>
            <RangeSlider
              value={rangeValue}
              onValueChange={setRangeValue}
              max={100}
              step={1}
              aria-label="Range"
            />
          </div>
        </div>
      </DemoSubSection>

      {/* Stepped Slider */}
      <DemoSubSection id="slider-stepped" title="Stepped">
        <div className="w-full max-w-[300px] space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-default text-sm">Step Size 25: {steppedValue[0]}%</span>
            </div>
            <RangeSlider
              value={steppedValue}
              onValueChange={setSteppedValue}
              max={100}
              step={25}
              aria-label="Stepped"
            />
          </div>
        </div>
      </DemoSubSection>

      {/* Disabled State */}
      <DemoSubSection id="slider-disabled" title="Disabled">
        <div className="w-full max-w-[300px] space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-default text-sm">Disabled: 50%</span>
            </div>
            <RangeSlider value={[50]} max={100} step={1} disabled aria-label="Disabled" />
          </div>
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
