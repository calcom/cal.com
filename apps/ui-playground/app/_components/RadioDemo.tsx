"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import { useState } from "react";

import { RadioField, RadioGroup as RadioArea } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function RadioDemo() {
  const [basicValue, setBasicValue] = useState("1");
  const [areaValue, setAreaValue] = useState("1");

  return (
    <DemoSection title="Radio">
      {/* Basic Radio Group */}
      <DemoSubSection id="radio-basic" title="Basic">
        <div className="w-full max-w-[300px] space-y-6">
          <RadioGroup.Root
            value={basicValue}
            onValueChange={setBasicValue}
            className="flex flex-col space-y-2">
            <RadioField label="Option 1" id="radio-1" value="1" />
            <RadioField label="Option 2" id="radio-2" value="2" />
            <RadioField label="Option 3 (Disabled)" id="radio-3" value="3" disabled />
          </RadioGroup.Root>
          <div className="text-default text-sm">Selected: {basicValue}</div>
        </div>
      </DemoSubSection>

      <DemoSubSection id="radio-basic-padding" title="With Padding">
        <div className="w-full max-w-[300px] space-y-6">
          <RadioGroup.Root
            value={basicValue}
            onValueChange={setBasicValue}
            className="flex flex-col space-y-2">
            <RadioField label="Option 1" id="radio-1" value="1" withPadding />
            <RadioField label="Option 2" id="radio-2" value="2" withPadding />
            <RadioField label="Option 3 (Disabled)" id="radio-3" value="3" disabled withPadding />
          </RadioGroup.Root>
          <div className="text-default text-sm">Selected: {basicValue}</div>
        </div>
      </DemoSubSection>

      {/* Radio Area Group */}
      <DemoSubSection id="radio-area" title="Radio Area">
        <div className="w-full max-w-[500px] space-y-6">
          <RadioArea.Group
            value={areaValue}
            onValueChange={setAreaValue}
            className="mt-1 flex flex-col gap-4">
            <RadioArea.Item value="1" className="bg-default w-full text-sm">
              <strong className="mb-1 block">Standard</strong>
              <p>Perfect for simple scheduling needs</p>
            </RadioArea.Item>
            <RadioArea.Item value="2" className="bg-default w-full text-sm">
              <strong className="mb-1 block">Pro</strong>
              <p>More power for growing businesses</p>
            </RadioArea.Item>
            <RadioArea.Item value="3" className="bg-default w-full text-sm opacity-70" disabled>
              <strong className="mb-1 block">Enterprise (Disabled)</strong>
              <p>Custom solutions for large organizations</p>
            </RadioArea.Item>
          </RadioArea.Group>
          <div className="text-default text-sm">Selected: {areaValue}</div>
        </div>
      </DemoSubSection>

      {/* Radio with Rich Content */}
      <DemoSubSection id="radio-rich" title="Rich Content">
        <div className="w-full max-w-[500px] space-y-6">
          <RadioGroup.Root
            value={basicValue}
            onValueChange={setBasicValue}
            className="flex flex-col space-y-2">
            <RadioField
              label={
                <div>
                  <div className="text-emphasis font-semibold">Basic Plan</div>
                  <div className="text-default text-sm">Free forever</div>
                </div>
              }
              id="radio-rich-1"
              value="1"
            />
            <RadioField
              label={
                <div>
                  <div className="text-emphasis font-semibold">Premium Plan</div>
                  <div className="text-default text-sm">$10/month</div>
                </div>
              }
              id="radio-rich-2"
              value="2"
            />
          </RadioGroup.Root>
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
