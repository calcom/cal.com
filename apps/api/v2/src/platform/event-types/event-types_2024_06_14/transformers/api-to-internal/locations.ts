import type { InputLocation_2024_06_14, InputTeamLocation_2024_06_14 } from "@calcom/platform-types";

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

export const apiToInternalintegrationsMapping = {
  "cal-video": "integrations:daily",
  "google-meet": "integrations:google:meet",
  "office365-video": "integrations:office365_video",
  zoom: "integrations:zoom",
  "whereby-video": "integrations:whereby_video",
  "whatsapp-video": "integrations:whatsapp_video",
  "webex-video": "integrations:webex_video",
  "telegram-video": "integrations:telegram_video",
  tandem: "integrations:tandem",
  "sylaps-video": "integrations:sylaps_video",
  "skype-video": "integrations:skype_video",
  "sirius-video": "integrations:sirius_video_video",
  "signal-video": "integrations:signal_video",
  "shimmer-video": "integrations:shimmer_video",
  "salesroom-video": "integrations:salesroom_video",
  "roam-video": "integrations:roam_video",
  "riverside-video": "integrations:riverside_video",
  "ping-video": "integrations:ping_video",
  "mirotalk-video": "integrations:mirotalk_video",
  jitsi: "integrations:jitsi",
  "jelly-video": "integrations:jelly_video",
  "jelly-conferencing": "integrations:jelly_conferencing",
  huddle: "integrations:huddle01",
  "facetime-video": "integrations:facetime_video",
  "element-call-video": "integrations:element-call_video",
  "eightxeight-video": "integrations:eightxeight_video",
  "discord-video": "integrations:discord_video",
  "demodesk-video": "integrations:demodesk_video",
  "campfire-video": "integrations:campfire_video",
} as const;

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
