import { getFirstDwdConferencingCredentialAppLocation } from "@calcom/lib/domainWideDelegation/server";
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

export const getLocationValuesForDb = <
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
    const firstDynamicGroupMemberDwdConferencingAppLocation = getFirstDwdConferencingCredentialAppLocation({
      credentials: firstDynamicGroupMember.credentials,
    });

    firstDynamicGroupMemberDefaultLocationUrl =
      firstDynamicGroupMemberMetadata?.defaultConferencingApp?.appLink ||
      firstDynamicGroupMemberDwdConferencingAppLocation;

    locationBodyString = firstDynamicGroupMemberDefaultLocationUrl || locationBodyString;
  }

  return {
    locationBodyString,
    organizerOrFirstDynamicGroupMemberDefaultLocationUrl: firstDynamicGroupMemberDefaultLocationUrl,
  };
};
