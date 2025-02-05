"use client";

import { useCallback, useState } from "react";

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

const countries = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "fr", label: "France" },
  { value: "de", label: "Germany" },
  { value: "it", label: "Italy" },
  { value: "es", label: "Spain" },
  { value: "au", label: "Australia" },
  { value: "jp", label: "Japan" },
  { value: "br", label: "Brazil" },
];

// Simulate an API call with delay
const searchCountries = (query: string) => {
  return new Promise<{ value: string; label: string }[]>((resolve) => {
    setTimeout(() => {
      const filtered = countries.filter((country) =>
        country.label.toLowerCase().includes(query.toLowerCase())
      );
      resolve(filtered);
    }, 1000); // Simulate network delay
  });
};

export default function SelectDemo() {
  const [singleValue, setSingleValue] = useState<{ value: string; label: string } | null>(null);
  const [multiValue, setMultiValue] = useState<{ value: string; label: string }[]>([]);
  const [asyncOptions, setAsyncOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleValueChange = (newValue: unknown, actionMeta: { action: string }) => {
    showToast(`Selected: ${JSON.stringify(newValue)}, Action: ${actionMeta.action}`, "success");
  };

  const loadOptions = useCallback(async (inputValue: string) => {
    setIsLoading(true);
    try {
      const results = await searchCountries(inputValue);
      setAsyncOptions(results);
    } catch (error) {
      showToast("Error loading options", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
            size="md"
          />
          <Select
            options={options}
            value={singleValue}
            onChange={(newValue) => setSingleValue(newValue)}
            isClearable
            placeholder="Small size select... (small)"
            size="sm"
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
          <Select
            options={options}
            value={multiValue}
            onChange={(newValue) => setMultiValue(newValue as { value: string; label: string }[])}
            isMulti
            isClearable
            placeholder="Choose multiple flavors... (small)"
            size="sm"
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

          <SelectField label="With Error" options={options} />
        </div>
        <div className="mt-4 space-y-4 md:w-80">
          <SelectField
            label="Flavor"
            options={options}
            onChange={handleValueChange}
            placeholder="Choose a flavor... (small)"
            size="sm"
          />

          <SelectField
            label="Required Field"
            options={options}
            required
            onChange={handleValueChange}
            placeholder="This field is required... (small)"
            size="sm"
          />

          <SelectField label="With Error (small)" options={options} size="sm" />
        </div>
      </DemoSubSection>

      {/* Async Select with Debounced Search */}
      <DemoSubSection id="select-async" title="Async Select with Debounced Search">
        <div className="space-y-4 md:w-80">
          <Select
            options={asyncOptions}
            onInputChange={(value) => {
              if (value) {
                loadOptions(value);
              }
            }}
            isLoading={isLoading}
            placeholder="Search for a country..."
            noOptionsMessage={({ inputValue }) =>
              inputValue ? "No countries found" : "Start typing to search..."
            }
            onChange={handleValueChange}
          />
          <Select
            options={asyncOptions}
            onInputChange={(value) => {
              if (value) {
                loadOptions(value);
              }
            }}
            isLoading={isLoading}
            placeholder="Search for a country... (small)"
            noOptionsMessage={({ inputValue }) =>
              inputValue ? "No countries found" : "Start typing to search..."
            }
            onChange={handleValueChange}
            size="sm"
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
