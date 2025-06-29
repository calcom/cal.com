"use server";

import { unstable_cache } from "next/cache";

import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrganizationSEOSettings } from "@calcom/features/ee/organizations/lib/orgSettings";
import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { shouldHideBrandingForTeamEvent } from "@calcom/lib/hideBranding";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

type TeamEventParams = {
  teamSlug: string;
  meetingSlug: string;
  orgSlug: string | null;
};

const getStaticTeamEventData = async ({ teamSlug, meetingSlug, orgSlug }: TeamEventParams) => {
  const team = await getTeamWithEventsData(teamSlug, meetingSlug, !!orgSlug, orgSlug ?? null);

  if (!team || !team.eventTypes?.[0]) {
    return null;
  }

  const eventData = team.eventTypes[0];
  const eventTypeId = eventData.id;
  const eventHostsUserData = await getUsersData(
    team.isPrivate,
    eventTypeId,
    eventData.hosts.map((h) => h.user)
  );
  const name = team.parent?.name ?? team.name ?? null;

  const organizationSettings = getOrganizationSEOSettings(team);
  const allowSEOIndexing = organizationSettings?.allowSEOIndexing ?? false;

  return {
    eventData: {
      eventTypeId,
      entity: {
        fromRedirectOfNonOrgLink: false,
        considerUnpublished: false,
        orgSlug,
        teamSlug: team.slug ?? null,
        name,
      },
      length: eventData.length,
      metadata: EventTypeMetaDataSchema.parse(eventData.metadata),
      profile: {
        image: team.parent
          ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
          : getPlaceholderAvatar(team.logoUrl, team.name),
        name,
        username: orgSlug,
      },
      title: eventData.title,
      users: eventHostsUserData,
      hidden: eventData.hidden,
      interfaceLanguage: eventData.interfaceLanguage,
      slug: eventData.slug,
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
      },
    },
    user: teamSlug,
    teamId: team.id,
    slug: meetingSlug,
    isBrandingHidden: shouldHideBrandingForTeamEvent({
      eventTypeId: eventData.id,
      team,
    }),
    orgBannerUrl: team.parent?.bannerUrl ?? "",
    isSEOIndexable: allowSEOIndexing,
  };
};

const getTeamWithEventsData = async (
  teamSlug: string,
  meetingSlug: string,
  isValidOrgDomain: boolean,
  currentOrgDomain: string | null
) => {
  const team = await prisma.team.findFirst({
    where: {
      ...getSlugOrRequestedSlug(teamSlug),
      parent: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
    },
    orderBy: {
      slug: { sort: "asc", nulls: "last" },
    },
    select: {
      id: true,
      isPrivate: true,
      hideBranding: true,
      parent: {
        select: {
          slug: true,
          name: true,
          bannerUrl: true,
          logoUrl: true,
          hideBranding: true,
          organizationSettings: {
            select: {
              allowSEOIndexing: true,
            },
          },
        },
      },
      logoUrl: true,
      name: true,
      slug: true,
      eventTypes: {
        where: {
          OR: [{ slug: meetingSlug }, { slug: { startsWith: `${meetingSlug}-team-id-` } }],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          isInstantEvent: true,
          schedulingType: true,
          metadata: true,
          length: true,
          hidden: true,
          disableCancelling: true,
          disableRescheduling: true,
          allowReschedulingCancelledBookings: true,
          interfaceLanguage: true,
          hosts: {
            take: 3,
            select: {
              user: {
                select: {
                  name: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      isOrganization: true,
      organizationSettings: {
        select: {
          allowSEOIndexing: true,
        },
      },
    },
  });

  return team;
};

const getUsersData = async (
  isPrivateTeam: boolean,
  eventTypeId: number,
  users: Pick<User, "username" | "name">[]
) => {
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
};

export const getCachedTeamEvent = unstable_cache(
  async ({ teamSlug, meetingSlug, orgSlug }: TeamEventParams) => {
    return await getStaticTeamEventData({ teamSlug, meetingSlug, orgSlug });
  },
  undefined,
  {
    revalidate: NEXTJS_CACHE_TTL,
  }
);
