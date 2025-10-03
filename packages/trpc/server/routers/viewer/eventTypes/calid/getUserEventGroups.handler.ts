import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
// import { getEventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByViewer";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TCalIdEventTypeInputSchema } from "./getByViewer.schema";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalIdEventTypeInputSchema;
};

export const getUserEventGroups = async ({ ctx, input }: GetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getUserProfiles:${ctx.user.id}`,
    rateLimitingType: "common",
  });
  const user = ctx.user;
  const filters = input?.filters;
  const forRoutingForms = input?.forRoutingForms;

  const userProfile = user.profile;
  const profile = await ProfileRepository.findByUpId(userProfile.upId);
  const parentOrgHasLockedEventTypes =
    profile?.organization?.organizationSettings?.lockEventTypeCreationForUsers;
  const isFilterSet = filters && hasFilter(filters);
  const isUpIdInFilter = filters?.upIds?.includes(userProfile.upId);

  let shouldListUserEvents = !isFilterSet || isUpIdInFilter;

  if (isFilterSet && filters?.upIds && !isUpIdInFilter) {
    shouldListUserEvents = true;
  }

  const profileMemberships = await prisma.calIdMembership.findMany({
    where: {
      userId: user.id,
      acceptedInvitation: true,
    },
    include: {
      calIdTeam: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          metadata: true,
          timeZone: true,
          timeFormat: true,
          weekStart: true,
          theme: true,
          brandColor: true,
          darkBrandColor: true,
          bio: true,
          hideTeamBranding: true,
          hideTeamProfileLink: true,
          isTeamPrivate: true,
          hideBookATeamMember: true,
          bookingFrequency: true,
        },
      },
    },
    orderBy: {
      role: "desc",
    },
  });

  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const memberships = profileMemberships.map((membership) => ({
    ...membership,
    calIdTeam: {
      ...membership.calIdTeam,
      metadata: teamMetadataSchema.parse(membership.calIdTeam.metadata),
    },
  }));

  type EventTypeGroup = {
    teamId?: number | null;
    parentId?: number | null;
    bookerUrl: string;
    membershipRole?: CalIdMembershipRole | null;
    profile: {
      slug: (typeof profile)["username"] | null;
      name: (typeof profile)["name"];
      image: string;
      eventTypesLockedByOrg?: boolean;
    };
    metadata: {
      membershipCount: number;
      readOnly: boolean;
    };
  };

  let eventTypeGroups: EventTypeGroup[] = [];

  if (shouldListUserEvents) {
    const bookerUrl = await getBookerBaseUrl(profile.organizationId ?? null);
    eventTypeGroups.push({
      teamId: null,
      bookerUrl,
      membershipRole: null,
      profile: {
        slug: profile.username,
        name: profile.name,
        image: getUserAvatarUrl({
          avatarUrl: profile.avatarUrl,
        }),
        eventTypesLockedByOrg: parentOrgHasLockedEventTypes,
      },
      metadata: {
        membershipCount: 1,
        readOnly: false,
      },
    });
  }

  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    await Promise.all(
      memberships
        .filter((mmship) => {
          // calidTeams don't have organization structure, so we just filter by teamIds if provided
          if (!filters || !hasFilter(filters)) {
            return true;
          }
          return filters?.teamIds?.includes(mmship.calIdTeam.id || 0) ?? false;
        })
        .map(async (membership) => {
          const calIdTeam = {
            ...membership.calIdTeam,
            metadata: teamMetadataSchema.parse(membership.calIdTeam.metadata),
          };

          let slug;

          if (forRoutingForms) {
            // For Routing form we want to ensure that the URL remains consistent
            slug = `team/${calIdTeam.slug}`;
          } else {
            // calidTeams use team/ prefix for consistency
            slug = calIdTeam.slug ? `team/${calIdTeam.slug}` : null;
          }

          return {
            teamId: calIdTeam.id,
            parentId: null, // calidTeams don't have parent organization structure
            bookerUrl: getBookerBaseUrlSync(null), // calidTeams don't have organization context
            membershipRole: membership.role,
            profile: {
              image: getPlaceholderAvatar(calIdTeam.logoUrl, calIdTeam.name),
              name: calIdTeam.name,
              slug,
            },
            metadata: {
              membershipCount: 0,
              readOnly: membership.role === CalIdMembershipRole.MEMBER,
            },
          };
        })
    )
  );

  const denormalizedPayload = {
    eventTypeGroups,
    // so we can show a dropdown when the user has teams
    profiles: eventTypeGroups.map((group) => ({
      ...group.profile,
      ...group.metadata,
      teamId: group.teamId,
      membershipRole: group.membershipRole,
    })),
  };

  return denormalizedPayload;
};

export function compareMembership(mship1: CalIdMembershipRole, mship2: CalIdMembershipRole) {
  const mshipToNumber = (mship: CalIdMembershipRole) =>
    Object.keys(CalIdMembershipRole).findIndex((mmship) => mmship === mship);
  return mshipToNumber(mship1) > mshipToNumber(mship2);
}
