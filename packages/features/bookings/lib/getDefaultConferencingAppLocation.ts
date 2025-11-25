import { getFirstDelegationConferencingCredentialAppLocation } from "@calcom/app-store/delegationCredential";
import { getAppFromSlug } from "@calcom/app-store/utils";
import type { User } from "@calcom/prisma/client";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

const getDefaultConferencingAppLocation = (
  organizerUserMetadata: User["metadata"],
  firstUserCredentials: CredentialForCalendarService[]
) => {
  let locationBodyString = "integrations:daily";
  const organizerMetadata = getOrganizerMetadata(organizerUserMetadata);
  const organizationDefaultLocation = getFirstDelegationConferencingCredentialAppLocation({
    credentials: firstUserCredentials,
  });

  if (organizerMetadata?.defaultConferencingApp?.appSlug) {
    const app = getAppFromSlug(organizerMetadata?.defaultConferencingApp?.appSlug);
    locationBodyString = app?.appData?.location?.type || locationBodyString;
  } else if (organizationDefaultLocation) {
    locationBodyString = organizationDefaultLocation;
  }

  return locationBodyString;
};

const getOrganizerOrFirstDynamicGroupMemberDefaultLocationUrl = (
  organizerUserMetadata: User["metadata"],
  isManagedEventType: boolean,
  isTeamEventType: boolean,
  organizerOrFirstDynamicGroupMemberDefaultLocationUrl?: string | null
) => {
  const organizerMetadata = getOrganizerMetadata(organizerUserMetadata);
  if (organizerMetadata?.defaultConferencingApp?.appSlug) {
    if (isManagedEventType || isTeamEventType) {
      return organizerMetadata?.defaultConferencingApp?.appLink;
    }
  }

  return organizerOrFirstDynamicGroupMemberDefaultLocationUrl;
};

const getOrganizerMetadata = (organizerUserMetadata: User["metadata"]) => {
  const metadataParseResult = userMetadataSchema.safeParse(organizerUserMetadata);
  return metadataParseResult.success ? metadataParseResult.data : undefined;
};

export { getDefaultConferencingAppLocation, getOrganizerOrFirstDynamicGroupMemberDefaultLocationUrl };
