import type { z } from "zod";

import type { zodNonRouterField } from "../zod";

type Field = z.infer<typeof zodNonRouterField>;

export function ensureStringOrStringArray(value: string | number | (string | number)[]): string | string[] {
  if (typeof value === "string") {
    return value;
  } else if (value instanceof Array) {
    return value.map((v) => v.toString());
  }
  return [value.toString()];
}

export function getLabelsFromOptionIds({
  options,
  optionIds,
}: {
  options: NonNullable<Field["options"]>;
  optionIds: string | string[];
}) {
  if (optionIds instanceof Array) {
    const labels = optionIds.map((optionId) => {
      const foundOption = options.find((option) => option.id === optionId);
      // It would mean that the optionId is actually a label which is why it isn't matching any option id.
      // Fallback to optionId(i.e. label) which was the case with legacy options
      if (!foundOption) {
        return optionId;
      }
      return foundOption.label;
    });
    return labels;
  } else {
    const foundOption = options.find((option) => option.id === optionIds);
    if (!foundOption) {
      return [optionIds];
    }
    return [foundOption.label];
  }
}
