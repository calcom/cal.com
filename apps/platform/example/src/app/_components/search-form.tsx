"use client";

import { useState } from "react";
import { AutoComplete, type Option } from "~/app/_components/autocomplete";
const services = [
  {
    value: "hair dresser",
    label: "Hair Dresser",
  },
  {
    value: "therapist",
    label: "Therapist",
  },
  {
    value: "dermatologist",
    label: "Dermatologist",
  },
] as const satisfies Array<Option>;

export const SuggestionBox = () => {
  const [value, setValue] = useState<Option | undefined>(undefined);
  return (
    <AutoComplete
      options={services}
      emptyMessage="No resulsts."
      placeholder="Search your expert..."
      onValueChange={setValue}
      value={value}
    />
  );
};
