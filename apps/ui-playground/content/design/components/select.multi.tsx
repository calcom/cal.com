"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Select } from "@calcom/ui/components/form";

const options = [
  { value: "chocolate", label: "Chocolate" },
  { value: "strawberry", label: "Strawberry" },
  { value: "vanilla", label: "Vanilla" },
  { value: "mint", label: "Mint" },
  { value: "coffee", label: "Coffee" },
];

export const MultiExample: React.FC = () => {
  const [multiValue, setMultiValue] = useState<{ value: string; label: string }[]>([]);

  return (
    <RenderComponentWithSnippet>
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
    </RenderComponentWithSnippet>
  );
};
