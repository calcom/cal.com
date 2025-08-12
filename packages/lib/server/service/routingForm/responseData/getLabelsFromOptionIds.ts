import type { Field } from "@calcom/app-store/routing-forms/types/types";

/**
 * Get labels from option IDs for fields with options (select, multiselect, radio).
 * Handles legacy cases where the value might already be a label.
 *
 * @param options - The field options array
 * @param optionIds - The option ID(s) to get labels for
 * @returns The label(s) corresponding to the option ID(s)
 */

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
