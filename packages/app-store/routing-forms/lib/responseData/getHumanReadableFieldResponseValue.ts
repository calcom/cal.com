import type { Field, FormResponse } from "@calcom/app-store/routing-forms/types/types";

/**
 * Ensures a value is either a string or string array.
 * Converts numbers to strings.
 *
 * @param value - The value to normalize
 * @returns String or string array
 */

function ensureStringOrStringArray(value: string | number | (string | number)[]): string | string[] {
  if (typeof value === "string") {
    return value;
  } else if (value instanceof Array) {
    return value.map((v) => v.toString());
  }
  return [value.toString()];
}

/**
 * Get labels from option IDs for fields with options (select, multiselect, radio).
 * Handles legacy cases where the value might already be a label.
 *
 * @param options - The field options array
 * @param optionIds - The option ID(s) to get labels for
 * @returns The label(s) corresponding to the option ID(s)
 */

function getLabelsFromOptionIds({
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

/**
 * Get the human-readable value for a field response.
 * For select/multiselect/radio fields, this returns the label of the selected option(s).
 * For other fields, it returns the value as-is.
 *
 * @param field - The field definition with options
 * @param value - The response value (typically an option ID for select fields)
 * @returns Array of human-readable values
 */
export function getHumanReadableFieldResponseValue({
  field,
  value,
}: {
  field: Pick<Field, "type" | "options">;
  value: FormResponse[string]["value"];
}): string | string[] {
  // For fields with options (select, multiselect, radio), use the existing getLabelsFromOptionIds function
  if (field.options) {
    const optionIds = ensureStringOrStringArray(value);
    return getLabelsFromOptionIds({ options: field.options, optionIds });
  }

  return ensureStringOrStringArray(value);
}
