"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const options = [
  { value: "chocolate", label: "Chocolate" },
  { value: "strawberry", label: "Strawberry" },
  { value: "vanilla", label: "Vanilla" },
  { value: "mint", label: "Mint" },
  { value: "coffee", label: "Coffee" },
];

export const FieldExample: React.FC = () => {
  const handleValueChange = (newValue: unknown, actionMeta: { action: string }) => {
    showToast(`Selected: ${JSON.stringify(newValue)}, Action: ${actionMeta.action}`, "success");
  };

  return (
    <RenderComponentWithSnippet>
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
    </RenderComponentWithSnippet>
  );
};
