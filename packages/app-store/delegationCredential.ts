import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import { metadata as office365CalendarMetaData } from "@calcom/app-store/office365calendar/_metadata";
import { metadata as office365VideoMetaData } from "@calcom/app-store/office365video/_metadata";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

const GOOGLE_WORKSPACE_SLUG = "google";
const OFFICE365_WORKSPACE_SLUG = "office365";
export const WORKSPACE_PLATFORM_SLUGS = [GOOGLE_WORKSPACE_SLUG, OFFICE365_WORKSPACE_SLUG] as const;
export type WORKSPACE_PLATFORM_SLUGS_TYPE = (typeof WORKSPACE_PLATFORM_SLUGS)[number];

export const isConferencingCredential = (credential: CredentialPayload) => {
  return (
    credential.type.endsWith("_video") ||
    credential.type.endsWith("_conferencing") ||
    credential.type.endsWith("_messaging")
  );
};

export const getDelegationCredentialAppMetadata = (
  slug: WORKSPACE_PLATFORM_SLUGS_TYPE,
  isConferencing?: boolean
) => {
  switch (slug) {
    case GOOGLE_WORKSPACE_SLUG:
      return isConferencing
        ? { type: googleMeetMetadata.type, appId: googleMeetMetadata.slug }
        : { type: googleCalendarMetadata.type, appId: googleCalendarMetadata.slug };

    case OFFICE365_WORKSPACE_SLUG:
      return isConferencing
        ? { type: office365VideoMetaData.type, appId: office365VideoMetaData.slug }
        : { type: office365CalendarMetaData.type, appId: office365CalendarMetaData.slug };

    default:
      throw new Error("App metadata does not exist");
  }
};

export function getFirstDelegationConferencingCredential({
  credentials,
}: {
  credentials: CredentialForCalendarService[];
}) {
  return credentials.find((credential) => isConferencingCredential(credential));
}

export function getFirstDelegationConferencingCredentialAppLocation({
  credentials,
}: {
  credentials: CredentialForCalendarService[];
}) {
  const delegatedConferencingCredential = getFirstDelegationConferencingCredential({ credentials });
  if (delegatedConferencingCredential?.appId === googleMeetMetadata.slug) {
    return googleMeetMetadata.appData?.location?.type ?? null;
  }
  if (delegatedConferencingCredential?.appId === office365VideoMetaData.slug) {
    return office365VideoMetaData.appData?.location?.type ?? null;
  }
  return null;
}
