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
    return [];
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
        const integrationType = reverseIntegrationsMapping[location.type];
        if (!integrationType) {
          throw new Error(`Unsupported integration type '${location.type}'.`);
        }
        const integration: IntegrationLocation = {
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
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "email":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "phone":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "address":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "text":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "number":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "textarea":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "multiemail":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
        };
      case "boolean":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
        };
      case "select":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          placeholder: field.placeholder,
          options: field.options?.map((option) => option.value) || [],
        };
      case "multiselect":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          options: field.options?.map((option) => option.value) || [],
        };
      case "checkbox":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          options: field.options?.map((option) => option.value) || [],
        };
      case "radio":
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          options: field.options?.map((option) => option.value) || [],
        };
      default:
        throw new Error(`Unsupported booking field type '${field.type}'.`);
    }
  });
}

export { getResponseEventTypeLocations, getResponseEventTypeBookingFields };
