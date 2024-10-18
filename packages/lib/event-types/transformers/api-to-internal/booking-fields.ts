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
    const systemName = { ...systemBeforeFieldName };
    if (systemName.variantsConfig?.variants?.fullName?.fields?.[0]) {
      systemName.variantsConfig.variants.fullName.fields[0].label = field.label;
    }

    if (systemName.variantsConfig?.variants?.fullName?.fields?.[0]) {
      systemName.variantsConfig.variants.fullName.fields[0].placeholder = field.placeholder;
    }
    // note(Lauris): we attach top level label and placeholder for easier access when converting database event type
    // to v2 response event type even though form builder uses label and placeholder from variantsConfig.
    systemName.label = field.label;
    systemName.placeholder = field.placeholder;

    return {
      ...systemName,
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

  if (field.type === "boolean") {
    return {
      name: field.slug,
      type: field.type,
      label: field.label,
      labelAsSafeHtml: `<p>${field.label}</p>\n`,
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
