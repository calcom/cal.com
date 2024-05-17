import slugify from "@calcom/lib/slugify";
import type { CreateEventTypeInput, Integration } from "@calcom/platform-types";

const integrationsMapping: Record<Integration, string> = {
  "cal-video": "integrations:daily",
};

function transformApiEventTypeLocations(inputLocations: CreateEventTypeInput["locations"]) {
  if (!inputLocations) {
    return undefined;
  }

  return inputLocations.map((location) => {
    const { type } = location;
    switch (type) {
      case "address":
        return { type: "inPerson", address: location.address };
      case "link":
        return { type: "link", link: location.link };
      case "integration":
        const integrationLabel = integrationsMapping[location.integration];
        return { type: integrationLabel };
      case "phone":
        return { type: "userPhone", hostPhoneNumber: location.phone };
      default:
        throw new Error(`Unsupported location type '${type}'`);
    }
  });
}

function transformApiEventTypeBookingFields(inputBookingFields: CreateEventTypeInput["bookingFields"]) {
  if (!inputBookingFields) {
    return undefined;
  }

  return inputBookingFields.map((field) => {
    const commonFields = {
      name: slugify(field.label),
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

    const options = "options" in field && field.options ? transformSelectOptions(field.options) : undefined;

    return {
      ...commonFields,
      options,
    };
  });
}

function transformSelectOptions(options: string[]) {
  return options.map((option) => ({
    label: option,
    value: option,
  }));
}

export { transformApiEventTypeLocations, transformApiEventTypeBookingFields };
