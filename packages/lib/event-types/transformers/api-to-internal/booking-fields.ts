import { type CreateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

import type { CustomField } from "../internal-to-api";

export function transformBookingFieldsApiToInternal(
  inputBookingFields: CreateEventTypeInput_2024_06_14["bookingFields"]
) {
  if (!inputBookingFields) {
    return [];
  }

  const customBookingFields = inputBookingFields.map((field) => {
    const commonFields: CustomField = {
      name: field.slug,
      type: field.type,
      label: field.label,
      sources: [
        {
          id: "user",
          type: "user",
          label: "User",
          fieldRequired: true,
        },
      ],
      editable: "user",
      required: field.required,
      placeholder: "placeholder" in field && field.placeholder ? field.placeholder : "",
    };

    const options =
      "options" in field && field.options ? transformSelectOptionsApiToInternal(field.options) : undefined;

    if (!options) {
      return commonFields;
    }

    return {
      ...commonFields,
      options,
    };
  });

  return customBookingFields;
}

export function transformSelectOptionsApiToInternal(options: string[]) {
  return options.map((option) => ({
    label: option,
    value: option,
  }));
}
