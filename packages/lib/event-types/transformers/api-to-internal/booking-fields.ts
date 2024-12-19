import type { InputBookingField_2024_06_14, OutputBookingField_2024_06_14 } from "@calcom/platform-types";

import {
  systemBeforeFieldEmail,
  systemBeforeFieldName,
  systemBeforeFieldLocation,
  systemBeforeFieldPhone,
  systemAfterFieldTitle,
  systemAfterFieldNotes,
  systemAfterFieldGuests,
  systemAfterFieldRescheduleReason,
  type CustomField,
  type SystemField,
} from "../internal-to-api";

export function transformBookingFieldsApiRequestToInternal(
  inputBookingFields: InputBookingField_2024_06_14[]
): (SystemField | CustomField)[] {
  const customBookingFields = inputBookingFields.map((field) => {
    const baseProperties = getBasePropertiesRequest(field);

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

function getBasePropertiesRequest(field: InputBookingField_2024_06_14): SystemField | CustomField {
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
      hidden: !!field.hidden,
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
    hidden: !!field.hidden,
  };
}

export function transformSelectOptionsApiToInternal(options: string[]) {
  return options.map((option) => ({
    label: option,
    value: option,
  }));
}

export function transformBookingFieldsApiResponseToInternal(bookingFields: OutputBookingField_2024_06_14[]) {
  const customBookingFields = bookingFields.map((field) => {
    const baseProperties = getBasePropertiesResponse(field);

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

function getBasePropertiesResponse(field: OutputBookingField_2024_06_14) {
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

  if (field.slug === "location") {
    return {
      ...systemBeforeFieldLocation,
      required: field.required,
      hidden: field.hidden,
    };
  }

  if (field.slug === "attendeePhoneNumber") {
    return {
      ...systemBeforeFieldPhone,
      required: field.required,
    };
  }

  if (field.slug === "rescheduleReason") {
    return {
      ...systemAfterFieldRescheduleReason,
      required: field.required,
      hidden: field.hidden,
    };
  }

  if (field.slug === "title") {
    return {
      ...systemAfterFieldTitle,
      required: field.required,
      hidden: field.hidden,
    };
  }

  if (field.slug === "notes") {
    return {
      ...systemAfterFieldNotes,
      required: field.required,
      hidden: field.hidden,
    };
  }

  if (field.slug === "guests") {
    return {
      ...systemAfterFieldGuests,
      required: field.required,
      hidden: field.hidden,
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
      hidden: !!field.hidden,
    };
  }

  return {
    name: field.slug,
    type: field.type,
    label: "label" in field ? field.label : "",
    sources: [
      {
        id: "user",
        type: "user",
        label: "User",
        fieldRequired: true,
      },
    ],
    editable: "user",
    required: "required" in field ? field.required : false,
    placeholder: "placeholder" in field && field.placeholder ? field.placeholder : "",
    disableOnPrefill: "disableOnPrefill" in field ? field.disableOnPrefill : false,
    hidden: "hidden" in field ? field.hidden : undefined,
  };
}
