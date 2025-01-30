"use client";

import { useState } from "react";

import { Checkbox, CheckboxField } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function CheckboxDemo() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-subtle bg-default rounded-lg border p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-emphasis flex w-full items-center justify-between rounded-md py-2 text-lg font-semibold">
        <span>Checkbox</span>
        <span className="text-subtle">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <DemoSection title="Checkbox">
          {/* Basic Checkboxes */}
          <DemoSubSection id="checkbox-basic" title="Basic">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="basic-unchecked" />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="basic-checked" defaultChecked />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="basic-disabled" disabled />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="basic-disabled-checked" disabled defaultChecked />
              </div>
            </div>
          </DemoSubSection>

          {/* With Description */}
          <DemoSubSection id="checkbox-description" title="With Description">
            <div className="space-y-4">
              <CheckboxField description="This is a regular description" id="desc-normal" />
              <CheckboxField
                description="This description acts as the label"
                descriptionAsLabel
                id="desc-as-label"
              />
              <CheckboxField
                id="desc-long"
                label="Label and description"
                description="Label and description"
              />
            </div>
          </DemoSubSection>

          {/* Label Positions */}
          <DemoSubSection id="checkbox-label" title="Label Positions">
            <div className="space-y-4">
              <CheckboxField
                description="Description with label above (default on mobile)"
                id="label-above"
                label="Label Above"
              />
              <div className="sm:min-w-[400px]">
                <CheckboxField
                  description="Description with label to the side (on larger screens)"
                  id="label-side"
                  label="Label to the Side"
                />
              </div>
            </div>
          </DemoSubSection>

          {/* With Information Icon */}
          <DemoSubSection id="checkbox-info" title="With Information Icon">
            <CheckboxField
              description="Checkbox with additional information"
              id="info-icon"
              label="Information Icon"
              informationIconText="This is additional information that appears in a tooltip"
            />
          </DemoSubSection>
        </DemoSection>
      )}
    </div>
  );
}
