import type { Field, FormResponse } from "@calcom/app-store/routing-forms/types/types";

import { ensureStringOrStringArray } from "./ensureStringOrStringArray";
import { getLabelsFromOptionIds } from "./getLabelsFromOptionIds";

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
