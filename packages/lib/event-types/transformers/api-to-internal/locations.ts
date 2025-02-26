import type { InputLocation_2024_06_14, InputTeamLocation_2024_06_14 } from "@calcom/platform-types";
import { type Integration_2024_06_14 } from "@calcom/platform-types";

import type {
  AttendeeAddressLocation,
  AttendeeDefinedLocation,
  AttendeePhoneLocation,
  OrganizerAddressLocation,
  OrganizerIntegrationLocation,
  OrganizerLinkLocation,
  OrganizerPhoneLocation,
  OrganizerConferencingSchema,
} from "../internal/locations";

const apiToInternalintegrationsMapping: Record<
  Integration_2024_06_14,
  "integrations:daily" | "integrations:google:meet"
> = {
  "cal-video": "integrations:daily",
  "google-meet": "integrations:google:meet",
};

function transformLocation<T extends InputLocation_2024_06_14>(location: T) {
  const { type } = location;
  switch (type) {
    case "address":
      return {
        type: "inPerson",
        address: location.address,
        displayLocationPublicly: location.public,
      } satisfies OrganizerAddressLocation;
    case "attendeeAddress":
      return { type: "attendeeInPerson" } satisfies AttendeeAddressLocation;
    case "link":
      return {
        type: "link",
        link: location.link,
        displayLocationPublicly: location.public,
      } satisfies OrganizerLinkLocation;
    case "integration":
      const integrationLabel = apiToInternalintegrationsMapping[location.integration];
      return { type: integrationLabel } satisfies OrganizerIntegrationLocation;
    case "phone":
      return {
        type: "userPhone",
        hostPhoneNumber: location.phone,
        displayLocationPublicly: location.public,
      } satisfies OrganizerPhoneLocation;
    case "attendeePhone":
      return { type: "phone" } satisfies AttendeePhoneLocation;
    case "attendeeDefined":
      return { type: "somewhereElse" } satisfies AttendeeDefinedLocation;
    default:
      throw new Error(`Unsupported input location type '${type}'`);
  }
}

export function transformLocationsApiToInternal(inputLocations: InputLocation_2024_06_14[] | undefined) {
  return inputLocations ? inputLocations.map(transformLocation) : [];
}

export function transformTeamLocationsApiToInternal(
  inputLocations: InputTeamLocation_2024_06_14[] | undefined
) {
  if (!inputLocations) return [];

  return inputLocations.map((location) => {
    if (location.type === "organizersDefaultApp") {
      return { type: "conferencing" } satisfies OrganizerConferencingSchema;
    }
    return transformLocation(location);
  });
}
