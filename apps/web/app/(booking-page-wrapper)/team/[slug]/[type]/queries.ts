import { unstable_cache } from "next/cache";

import { processEventDataShared } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { TeamService, type TeamWithEventTypes } from "@calcom/lib/server/service/team";
import { prisma } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import {
  eventTypeMetaDataSchemaWithTypedApps,
  bookerLayouts as bookerLayoutsSchema,
} from "@calcom/prisma/zod-utils";

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

async function getEventTypeUsersData(
  isPrivateTeam: boolean,
  eventTypeId: number,
  users: Pick<User, "username" | "name">[]
): Promise<Array<{ username: string; name: string }>> {
  if (!isPrivateTeam && users.length > 0) {
    return users
      .filter((user) => user.username)
      .map((user) => ({
        username: user.username ?? "",
        name: user.name ?? "",
      }));
  }

  if (!isPrivateTeam && users.length === 0) {
    const { users: data } = await prisma.eventType.findUniqueOrThrow({
      where: { id: eventTypeId },
      select: {
        users: {
          take: 1,
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    return data.length > 0
      ? [
          {
            username: data[0].username ?? "",
            name: data[0].name ?? "",
          },
        ]
      : [];
  }

  return [];
}

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
  const eventTypeId = eventData.id;

  const eventHostsUserData = await getEventTypeUsersData(
    team.isPrivate,
    eventTypeId,
    eventData.hosts?.map((h) => h.user) ?? []
  );

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
    profile: {
      username: team.slug,
      name,
      weekStart: eventData.hosts?.[0]?.user?.weekStart || "Monday",
      image: team.parent
        ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
        : getPlaceholderAvatar(team.logoUrl, team.name),
      brandColor: team.brandColor,
      darkBrandColor: team.darkBrandColor,
      theme: team.theme,
      bookerLayouts: bookerLayoutsSchema.parse(eventMetaData?.bookerLayouts || null),
    },
    subsetOfUsers: eventHostsUserData ?? [],
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
