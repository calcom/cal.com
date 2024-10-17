import type { InputBookingField_2024_06_14 } from "@calcom/platform-types";

import {
  systemBeforeFieldEmail,
  systemBeforeFieldName,
  type CustomField,
  type SystemField,
} from "../internal-to-api";

export function transformBookingFieldsApiToInternal(
  inputBookingFields: InputBookingField_2024_06_14[]
): (SystemField | CustomField)[] {
  const customBookingFields = inputBookingFields.map((field) => {
    const baseProperties = getBaseProperties(field);

    const options =
      "options" in field && field.options ? transformSelectOptionsApiToInternal(field.options) : undefined;

    if (!options) {
      return baseProperties;
    }

    return {
      ...baseProperties,
      options,
    };
  });

  return customBookingFields;
}

function getBaseProperties(field: InputBookingField_2024_06_14): SystemField | CustomField {
  if (field.type === "name") {
    return {
      ...systemBeforeFieldName,
      label: field.label,
      placeholder: field.placeholder,
      disableOnPrefill: field.disableOnPrefill,
    };
  }

  if (field.type === "email") {
    return {
      ...systemBeforeFieldEmail,
      label: field.label,
      placeholder: field.placeholder,
      disableOnPrefill: field.disableOnPrefill,
    };
  }

  return {
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
    disableOnPrefill: field.disableOnPrefill,
  };
}

export function transformSelectOptionsApiToInternal(options: string[]) {
  return options.map((option) => ({
    label: option,
    value: option,
  }));
}
