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

export const BasicExample: React.FC = () => {
  const [singleValue, setSingleValue] = useState<{ value: string; label: string } | null>(null);

  return (
    <RenderComponentWithSnippet>
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
          placeholder="Small size select..."
          size="sm"
        />
      </div>
    </RenderComponentWithSnippet>
  );
};
