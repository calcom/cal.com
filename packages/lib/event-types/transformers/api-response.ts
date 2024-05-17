import type {
  AddressLocation,
  IntegrationLocation,
  LinkLocation,
  PhoneLocation,
  Integration,
} from "@calcom/platform-types";

import type { transformApiEventTypeBookingFields, transformApiEventTypeLocations } from "./api-request";

const reverseIntegrationsMapping: Record<string, Integration> = {
  "integrations:daily": "cal-video",
};

function getResponseEventTypeLocations(
  transformedLocations: ReturnType<typeof transformApiEventTypeLocations>
) {
  if (!transformedLocations) {
    return undefined;
  }

  return transformedLocations.map((location) => {
    switch (location.type) {
      case "inPerson": {
        if (!location.address) {
          throw new Error("Address location must have an address");
        }
        const addressLocation: AddressLocation = {
          type: "address",
          address: location.address,
        };
        return addressLocation;
      }
      case "link": {
        if (!location.link) {
          throw new Error("Link location must have a link");
        }
        const linkLocation: LinkLocation = {
          type: "link",
          link: location.link,
        };
        return linkLocation;
      }
      case "userPhone": {
        if (!location.hostPhoneNumber) {
          throw new Error("Phone location must have a phone number");
        }
        const phoneLocation: PhoneLocation = {
          type: "phone",
          phone: location.hostPhoneNumber,
        };
        return phoneLocation;
      }
      default: {
        const originalType = reverseIntegrationsMapping[location.type];
        if (!originalType) {
          throw new Error(`Unsupported integration type '${location.type}'.`);
        }
        const integrationType = location.type.split(":")[1];
        const integration: IntegrationLocation = {
          type: "integration",
          integration: reverseIntegrationsMapping[integrationType],
        };
        return integration;
      }
    }
  });
}

function getResponseEventTypeBookingFields(
  transformedBookingFields: ReturnType<typeof transformApiEventTypeBookingFields>
) {
  if (!transformedBookingFields) {
    return undefined;
  }

  return transformedBookingFields.map((field) => {
    const baseField = {
      type: field.type,
      label: field.label,
      required: field.required,
      placeholder: field.placeholder || "", // Ensure placeholder is not undefined
    };

    const options = ["select", "multiselect", "checkbox", "radio"].includes(field.type)
      ? field.options?.map((option) => option.value)
      : undefined;

    return {
      ...baseField,
      options,
    };
  });
}

export { getResponseEventTypeLocations, getResponseEventTypeBookingFields };
