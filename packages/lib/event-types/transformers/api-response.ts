import type {
  AddressLocation_2024_06_14,
  IntegrationLocation_2024_06_14,
  LinkLocation_2024_06_14,
  PhoneLocation_2024_06_14,
  Integration_2024_06_14,
} from "@calcom/platform-types";

import type { transformApiEventTypeBookingFields, transformApiEventTypeLocations } from "./api-request";

const reverseIntegrationsMapping: Record<string, Integration_2024_06_14> = {
  "integrations:daily": "cal-video",
};

function getResponseEventTypeLocations(
  transformedLocations: ReturnType<typeof transformApiEventTypeLocations>
) {
  if (!transformedLocations) {
    return [];
  }

  return transformedLocations.map((location) => {
    switch (location.type) {
      case "inPerson": {
        if (!location.address) {
          throw new Error("Address location must have an address");
        }
        const addressLocation: AddressLocation_2024_06_14 = {
          type: "address",
          address: location.address,
          public: location.displayLocationPublicly,
        };
        return addressLocation;
      }
      case "link": {
        if (!location.link) {
          throw new Error("Link location must have a link");
        }
        const linkLocation: LinkLocation_2024_06_14 = {
          type: "link",
          link: location.link,
          public: location.displayLocationPublicly,
        };
        return linkLocation;
      }
      case "userPhone": {
        if (!location.hostPhoneNumber) {
          throw new Error("Phone location must have a phone number");
        }
        const phoneLocation: PhoneLocation_2024_06_14 = {
          type: "phone",
          phone: location.hostPhoneNumber,
          public: location.displayLocationPublicly,
        };
        return phoneLocation;
      }
      default: {
        const integrationType = reverseIntegrationsMapping[location.type];
        if (!integrationType) {
          throw new Error(`Unsupported integration type '${location.type}'.`);
        }
        const integration: IntegrationLocation_2024_06_14 = {
          type: "integration",
          integration: integrationType,
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
    return [];
  }

  return transformedBookingFields.map((field) => {
    switch (field.type) {
      case "name":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "email":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "phone":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "address":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "text":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "number":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "textarea":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "multiemail":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "boolean":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
        };
      case "select":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
          options: "options" in field ? field.options?.map((option) => option.value) : [],
        };
      case "multiselect":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          options: "options" in field ? field.options?.map((option) => option.value) : [],
        };
      case "checkbox":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          options: "options" in field ? field.options?.map((option) => option.value) : [],
        };
      case "radio":
        return {
          type: field.type,
          slug: field.name,
          label: field.label,
          required: field.required,
          options: "options" in field ? field.options?.map((option) => option.value) : [],
        };
      default:
        throw new Error(`Unsupported booking field type '${field.type}'.`);
    }
  });
}

export { getResponseEventTypeLocations, getResponseEventTypeBookingFields };
