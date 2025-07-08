import { unstable_cache } from "next/cache";

import {
  getEventTypeHosts,
  getOwnerFromUsersArray,
  getProfileFromEvent,
  getUsersFromEvent,
  processEventDataShared,
} from "@calcom/features/eventtypes/lib/getPublicEvent";
import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { TeamService, type TeamWithEventTypes } from "@calcom/lib/server/service/team";
import { prisma } from "@calcom/prisma";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

export const getCachedTeamWithEventTypes = unstable_cache(
  async (teamSlug: string, meetingSlug: string, orgSlug: string | null) => {
    return await TeamService.getTeamWithEventTypes(teamSlug, meetingSlug, orgSlug);
  },
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

export const getCachedEventData = unstable_cache(
  async ({
    team,
    orgSlug,
    fromRedirectOfNonOrgLink,
  }: {
    team: TeamWithEventTypes;
    orgSlug: string | null;
    fromRedirectOfNonOrgLink: boolean;
  }) => {
    return await processEventDataForBooking({
      team,
      orgSlug,
      fromRedirectOfNonOrgLink,
    });
  },
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);

export async function processEventDataForBooking({
  team,
  orgSlug,
  fromRedirectOfNonOrgLink,
}: {
  team: TeamWithEventTypes;
  orgSlug: string | null;
  fromRedirectOfNonOrgLink: boolean;
}) {
  if (!team?.eventTypes?.[0]) {
    return null;
  }

  const eventData = team.eventTypes[0];

  const { subsetOfHosts, hosts } = await getEventTypeHosts({
    hosts: eventData.hosts,
  });

  let users = null;
  let enrichedOwner = null;
  if (!team.isPrivate) {
    if (eventData.owner) {
      enrichedOwner = await UserRepository.enrichUserWithItsProfile({
        user: eventData.owner,
      });
    }

    users =
      (await getUsersFromEvent({ ...eventData, owner: enrichedOwner, subsetOfHosts, hosts }, prisma)) ||
      (await getOwnerFromUsersArray(prisma, eventData.id));
  }

  const name = team.parent?.name ?? team.name ?? null;
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;

  const eventMetaData = eventTypeMetaDataSchemaWithTypedApps.parse(eventData.metadata);

  const eventDataShared = await processEventDataShared({
    eventData,
    metadata: eventMetaData,
    prisma,
  });

  return {
    ...eventDataShared,
    owner: enrichedOwner,
    subsetOfHosts,
    hosts,
    profile: getProfileFromEvent({ ...eventData, owner: enrichedOwner, subsetOfHosts, hosts }),
    subsetOfUsers: users,
    users,
    entity: {
      fromRedirectOfNonOrgLink,
      considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
      orgSlug,
      teamSlug: team.slug ?? null,
      name,
      hideProfileLink: false,
      logoUrl: team.parent
        ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
        : getPlaceholderAvatar(team.logoUrl, team.name),
    },
  };
}
