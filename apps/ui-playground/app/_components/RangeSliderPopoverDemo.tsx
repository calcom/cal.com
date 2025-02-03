"use client";

import { useState } from "react";

import { RangeSliderPopover } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function RangeSliderPopoverDemo() {
  const [defaultRange, setDefaultRange] = useState([15, 30]);
  const [customRange, setCustomRange] = useState([5, 20]);
  const [largeRange, setLargeRange] = useState([0, 100]);

  return (
    <DemoSection title="Range Slider Popover">
      <DemoSubSection id="range-slider-popover-basic" title="Basic Usage">
        <div className="flex flex-col space-y-8">
          <div className="space-y-2">
            <h3 className="text-emphasis text-sm font-medium">Default Range (15-30 mins)</h3>
            <RangeSliderPopover
              triggerText="Total time"
              value={defaultRange}
              onChange={setDefaultRange}
              min={0}
              max={48}
              badgeVariant="default"
              inputSuffix="mins"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-emphasis text-sm font-medium">Custom Range with Success Badge (5-20 mins)</h3>
            <RangeSliderPopover
              triggerText="Meeting duration"
              value={customRange}
              onChange={setCustomRange}
              min={5}
              max={20}
              badgeVariant="success"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-emphasis text-sm font-medium">Large Range with Warning Badge (0-100 mins)</h3>
            <RangeSliderPopover
              triggerText="Extended duration"
              value={largeRange}
              onChange={setLargeRange}
              min={0}
              max={100}
              step={5}
              badgeVariant="warning"
            />
          </div>

          <div className="mt-4">
            <h4 className="text-default text-sm font-medium">Selected Values:</h4>
            <pre className="text-emphasis bg-subtle mt-2 rounded-md p-4 text-sm">
              {JSON.stringify(
                {
                  defaultRange,
                  customRange,
                  largeRange,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
