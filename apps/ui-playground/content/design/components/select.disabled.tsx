"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Select, SelectField } from "@calcom/ui/components/form";

const options = [
  { value: "chocolate", label: "Chocolate" },
  { value: "strawberry", label: "Strawberry" },
  { value: "vanilla", label: "Vanilla" },
  { value: "mint", label: "Mint" },
  { value: "coffee", label: "Coffee" },
];

export const DisabledExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4 md:w-80">
      <Select options={options} isDisabled placeholder="This select is disabled..." />
      <SelectField
        label="Disabled Field"
        options={options}
        isDisabled
        placeholder="This field is disabled..."
      />
    </div>
  </RenderComponentWithSnippet>
);
