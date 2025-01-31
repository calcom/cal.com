"use client";

import { useState } from "react";

import { Select, SelectField } from "@calcom/ui";
import { showToast } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

const options = [
  { value: "chocolate", label: "Chocolate" },
  { value: "strawberry", label: "Strawberry" },
  { value: "vanilla", label: "Vanilla" },
  { value: "mint", label: "Mint" },
  { value: "coffee", label: "Coffee" },
];

const groupedOptions = [
  {
    label: "Fruits",
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "orange", label: "Orange" },
    ],
  },
  {
    label: "Vegetables",
    options: [
      { value: "carrot", label: "Carrot" },
      { value: "broccoli", label: "Broccoli" },
      { value: "spinach", label: "Spinach" },
    ],
  },
];

export default function SelectDemo() {
  const [singleValue, setSingleValue] = useState<{ value: string; label: string } | null>(null);
  const [multiValue, setMultiValue] = useState<{ value: string; label: string }[]>([]);

  const handleValueChange = (newValue: unknown, actionMeta: { action: string }) => {
    showToast(`Selected: ${JSON.stringify(newValue)}, Action: ${actionMeta.action}`, "success");
  };

  return (
    <DemoSection title="Select">
      {/* Basic Select */}
      <DemoSubSection id="select-basic" title="Basic">
        <div className="space-y-4 md:w-80">
          <Select
            options={options}
            value={singleValue}
            onChange={(newValue) => setSingleValue(newValue)}
            isClearable
            placeholder="Choose a flavor..."
          />
        </div>
      </DemoSubSection>

      {/* Multi Select */}
      <DemoSubSection id="select-multi" title="Multi Select">
        <div className="space-y-4 md:w-80">
          <Select
            options={options}
            value={multiValue}
            onChange={(newValue) => setMultiValue(newValue as { value: string; label: string }[])}
            isMulti
            isClearable
            placeholder="Choose multiple flavors..."
          />
        </div>
      </DemoSubSection>

      {/* Grouped Options */}
      <DemoSubSection id="select-grouped" title="Grouped Options">
        <div className="space-y-4 md:w-80">
          <Select options={groupedOptions} placeholder="Choose food..." />
        </div>
      </DemoSubSection>

      {/* Select Field */}
      <DemoSubSection id="select-field" title="Select Field">
        <div className="space-y-4 md:w-80">
          <SelectField
            label="Flavor"
            options={options}
            onChange={handleValueChange}
            placeholder="Choose a flavor..."
          />

          <SelectField
            label="Required Field"
            options={options}
            required
            onChange={handleValueChange}
            placeholder="This field is required..."
          />

          <SelectField
            label="With Error"
            options={options}
            error="Please select a valid option"
            onChange={handleValueChange}
            placeholder="This field has an error..."
          />
        </div>
      </DemoSubSection>

      {/* Disabled State */}
      <DemoSubSection id="select-disabled" title="Disabled State">
        <div className="space-y-4 md:w-80">
          <Select options={options} isDisabled placeholder="This select is disabled..." />
          <SelectField
            label="Disabled Field"
            options={options}
            isDisabled
            placeholder="This field is disabled..."
          />
        </div>
      </DemoSubSection>

      {/* Loading State */}
      <DemoSubSection id="select-loading" title="Loading State">
        <div className="space-y-4 md:w-80">
          <Select options={options} isLoading placeholder="Loading options..." />
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
