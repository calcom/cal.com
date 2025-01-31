"use client";

import { Icon, InputField } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function TextFieldDemo() {
  const sizes = ["sm", "md"] as const;

  return (
    <DemoSection title="TextField">
      {/* Basic TextField */}
      <DemoSubSection id="textfield-basic" title="Basic">
        <div className="space-y-6">
          <div className="space-y-4">
            {sizes.map((size) => (
              <InputField
                key={size}
                label={`Basic TextField (${size})`}
                placeholder="Enter text..."
                type="text"
                size={size}
              />
            ))}
          </div>
        </div>
      </DemoSubSection>

      {/* With Hints and Errors */}
      <DemoSubSection id="textfield-hints" title="With Hints & Errors">
        <div className="space-y-6">
          <div className="space-y-4">
            {sizes.map((size) => (
              <div key={size} className="space-y-4">
                <InputField
                  label={`With Hint (${size})`}
                  placeholder="Enter text..."
                  type="text"
                  hint="This is a helpful hint message"
                  size={size}
                />
                <InputField
                  label={`With Error (${size})`}
                  placeholder="Enter text..."
                  type="text"
                  error="This field has an error"
                  size={size}
                />
                <InputField
                  label={`With Multiple Hints (${size})`}
                  placeholder="Enter text..."
                  type="text"
                  hint="Primary hint message"
                  hintErrors={["Additional hint 1", "Additional hint 2"]}
                  size={size}
                />
              </div>
            ))}
          </div>
        </div>
      </DemoSubSection>

      {/* With Add-ons */}
      <DemoSubSection id="textfield-addons" title="With Add-ons">
        <div className="space-y-6">
          <div className="space-y-4">
            {sizes.map((size) => (
              <div key={size} className="space-y-4">
                <InputField
                  label={`Leading Add-on (${size})`}
                  placeholder="Enter username"
                  addOnLeading={<Icon name="user" className="text-subtle h-4 w-4" />}
                  size={size}
                />
                <InputField label={`Suffix Add-on (${size})`} addOnSuffix=".com" size={size} />
                <InputField
                  label={`Both Add-ons (${size})`}
                  addOnLeading="https://"
                  addOnSuffix=".cal.com"
                  size={size}
                />
                <InputField
                  label={`Clickable Add-on (${size})`}
                  placeholder="Select date"
                  addOnSuffix={<Icon name="calendar" className="text-subtle h-4 w-4" />}
                  onClickAddon={() => alert("Add-on clicked!")}
                  size={size}
                />
              </div>
            ))}
          </div>
        </div>
      </DemoSubSection>

      {/* Label Variations */}
      <DemoSubSection id="textfield-labels" title="Label Variations">
        <div className="space-y-6">
          <div className="space-y-4">
            {sizes.map((size) => (
              <div key={size} className="space-y-4">
                <InputField
                  label={`Required Field (${size})`}
                  placeholder="This field is required"
                  required
                  showAsteriskIndicator
                  size={size}
                />
                <InputField
                  label={`Screen Reader Only Label (${size})`}
                  placeholder="Label only visible to screen readers"
                  labelSrOnly
                  size={size}
                />
                <InputField
                  label={`With Locked Icon (${size})`}
                  placeholder="This field has a lock icon"
                  LockedIcon={<Icon name="lock" className="text-subtle h-4 w-4" />}
                  size={size}
                />
                <InputField
                  label={`Custom Label Props (${size})`}
                  placeholder="Custom label styling"
                  labelClassName="text-blue-500 font-bold"
                  size={size}
                />
              </div>
            ))}
          </div>
        </div>
      </DemoSubSection>

      {/* States */}
      <DemoSubSection id="textfield-states" title="States">
        <div className="space-y-6">
          <div className="space-y-4">
            {sizes.map((size) => (
              <div key={size} className="space-y-4">
                <InputField
                  label={`Disabled TextField (${size})`}
                  placeholder="This field is disabled"
                  disabled
                  size={size}
                />
                <InputField
                  label={`Read-only TextField (${size})`}
                  placeholder="This field is read-only"
                  value="Read-only value"
                  readOnly
                  size={size}
                />
                <InputField
                  label={`Loading State (${size})`}
                  placeholder="This field is loading"
                  type="text"
                  value="Loading..."
                  size={size}
                />
              </div>
            ))}
          </div>
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
