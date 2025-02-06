import type {
  OutputConferencingLocation_2024_06_14,
  OutputIntegration_2024_06_14,
  OutputIntegrationLocation_2024_06_14,
  OutputAddressLocation_2024_06_14,
  OutputAttendeeAddressLocation_2024_06_14,
  OutputAttendeeDefinedLocation_2024_06_14,
  OutputAttendeePhoneLocation_2024_06_14,
  OutputLinkLocation_2024_06_14,
  OutputPhoneLocation_2024_06_14,
  OutputUnknownLocation_2024_06_14,
} from "@calcom/platform-types";

import type { InternalLocation } from "../internal/locations";

const internalToApiIntegrationsMapping: Record<string, OutputIntegration_2024_06_14> = {
  "integrations:daily": "cal-video",
  "integrations:google:meet": "google-meet",
  "integrations:zoom": "zoom",
  "integrations:whereby_video": "whereby-video",
  "integrations:whatsapp_video": "whatsapp-video",
  "integrations:webex_video": "webex-video",
  "integrations:telegram_video": "telegram-video",
  "integrations:tandem": "tandem",
  "integrations:sylaps_video": "sylaps-video",
  "integrations:skype_video": "skype-video",
  "integrations:sirius_video_video": "sirius-video",
  "integrations:signal_video": "signal-video",
  "integrations:shimmer_video": "shimmer-video",
  "integrations:salesroom_video": "salesroom-video",
  "integrations:roam_video": "roam-video",
  "integrations:riverside_video": "riverside-video",
  "integrations:ping_video": "ping-video",
  "integrations:office365_video": "office365-video",
  "integrations:mirotalk_video": "mirotalk-video",
  "integrations:jitsi": "jitsi",
  "integrations:jelly_video": "jelly-video",
  "integrations:jelly_conferencing": "jelly-conferencing",
  "integrations:huddle01": "huddle",
  "integrations:facetime_video": "facetime-video",
  "integrations:element-call_video": "element-call-video",
  "integrations:eightxeight_video": "eightxeight-video",
  "integrations:discord_video": "discord-video",
  "integrations:demodesk_video": "demodesk-video",
  "integrations:campsite_conferencing": "campsite-conferencing",
  "integrations:campfire_video": "campfire-video",
  "integrations:around_video": "around-video",
};

export function transformLocationsInternalToApi(internalLocations: InternalLocation[] | undefined) {
  if (!internalLocations) {
    return [];
  }

  return internalLocations.map((location) => {
    switch (location.type) {
      case "inPerson": {
        if (!location.address) {
          throw new Error("Address location must have an address");
        }
        const addressLocation: OutputAddressLocation_2024_06_14 = {
          type: "address",
          address: location.address,
          public: location.displayLocationPublicly,
        };
        return addressLocation;
      }
      case "attendeeInPerson": {
        const attendeeAddressLocation: OutputAttendeeAddressLocation_2024_06_14 = {
          type: "attendeeAddress",
        };
        return attendeeAddressLocation;
      }
      case "link": {
        if (!location.link) {
          throw new Error("Link location must have a link");
        }
        const linkLocation: OutputLinkLocation_2024_06_14 = {
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
        const phoneLocation: OutputPhoneLocation_2024_06_14 = {
          type: "phone",
          phone: location.hostPhoneNumber,
          public: location.displayLocationPublicly,
        };
        return phoneLocation;
      }
      case "phone": {
        const attendeePhoneLocation: OutputAttendeePhoneLocation_2024_06_14 = {
          type: "attendeePhone",
        };
        return attendeePhoneLocation;
      }
      case "somewhereElse": {
        const attendeeDefinedLocation: OutputAttendeeDefinedLocation_2024_06_14 = {
          type: "attendeeDefined",
        };
        return attendeeDefinedLocation;
      }
      case "conferencing": {
        const conferencingLocation: OutputConferencingLocation_2024_06_14 = {
          type: "conferencing",
        };
        return conferencingLocation;
      }
      default: {
        const integrationType = internalToApiIntegrationsMapping[location.type];
        if (!integrationType) {
          const unknown: OutputUnknownLocation_2024_06_14 = {
            type: "unknown",
            location: JSON.stringify(location),
          };
          return unknown;
        }
        const integration: OutputIntegrationLocation_2024_06_14 = {
          type: "integration",
          integration: integrationType,
          link: location.link,
          credentialId: location.credentialId,
        };
        return integration;
      }
    }
  });
}
