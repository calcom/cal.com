"use client";

import { Select } from "@calcom/ui/components/form";
import { RenderComponentWithSnippet } from "@/app/components/render";

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

export const GroupedExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4 md:w-80">
      <Select options={groupedOptions} placeholder="Choose food..." />
    </div>
  </RenderComponentWithSnippet>
);
