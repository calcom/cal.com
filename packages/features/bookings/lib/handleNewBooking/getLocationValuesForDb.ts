import { getFirstDelegationConferencingCredentialAppLocation } from "@calcom/app-store/delegationCredential";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { Prisma } from "@calcom/prisma/client";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

const sortUsersByDynamicList = <TUser extends { username: string | null }>(
  users: TUser[],
  dynamicUserList: string[]
) => {
  return users.sort((a, b) => {
    const aIndex = (a.username && dynamicUserList.indexOf(a.username)) || 0;
    const bIndex = (b.username && dynamicUserList.indexOf(b.username)) || 0;
    return aIndex - bIndex;
  });
};

export const _getLocationValuesForDb = <
  TUser extends {
    username: string | null;
    metadata: Prisma.JsonValue;
    credentials: CredentialForCalendarService[];
  }
>({
  dynamicUserList,
  users,
  location: locationBodyString,
}: {
  dynamicUserList: string[];
  users: TUser[];
  location: string;
}) => {
  const isDynamicGroupBookingCase = dynamicUserList.length > 1;
  let firstDynamicGroupMemberDefaultLocationUrl;
  // TODO: It's definition should be moved to getLocationValueForDb
  if (isDynamicGroupBookingCase) {
    users = sortUsersByDynamicList(users, dynamicUserList);
    const firstDynamicGroupMember = users[0];
    const firstDynamicGroupMemberMetadata = userMetadataSchema.parse(firstDynamicGroupMember.metadata);
    const firstDynamicGroupMemberDelegationCredentialConferencingAppLocation =
      getFirstDelegationConferencingCredentialAppLocation({
        credentials: firstDynamicGroupMember.credentials,
      });

    const defaultConferencingApp = firstDynamicGroupMemberMetadata?.defaultConferencingApp;

    const hasMemberSetConferencingPreference =
      !!defaultConferencingApp?.appSlug || !!defaultConferencingApp?.appLink;

    firstDynamicGroupMemberDefaultLocationUrl =
      (hasMemberSetConferencingPreference
        ? defaultConferencingApp?.appLink
        : firstDynamicGroupMemberDelegationCredentialConferencingAppLocation) ?? null;

    locationBodyString = firstDynamicGroupMemberDefaultLocationUrl || locationBodyString;
  }

  return {
    locationBodyString,
    organizerOrFirstDynamicGroupMemberDefaultLocationUrl: firstDynamicGroupMemberDefaultLocationUrl,
  };
};

export const getLocationValuesForDb = withReporting(_getLocationValuesForDb, "getLocationValuesForDb");
