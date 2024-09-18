import type {
  AddressLocation_2024_06_14,
  IntegrationLocation_2024_06_14,
  LinkLocation_2024_06_14,
  PhoneLocation_2024_06_14,
  Integration_2024_06_14,
} from "@calcom/platform-types";

import type { transformLocationsApiToInternal } from "../api-to-internal";

const reverseIntegrationsMapping: Record<string, Integration_2024_06_14> = {
  "integrations:daily": "cal-video",
};

export function transformLocationsInternalToApi(
  transformedLocations: ReturnType<typeof transformLocationsApiToInternal>
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
