import { Prisma } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import { orderBy } from "lodash";

import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { CAL_URL } from "@calcom/lib/constants";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getBookerUrl } from "@calcom/lib/server/getBookerUrl";
import type { PrismaClient } from "@calcom/prisma";
import { baseEventTypeSelect } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TEventTypeInputSchema } from "./getByViewer.schema";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventTypeInputSchema;
};

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  username: true,
  name: true,
});

const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
  // Position is required by lodash to sort on it. Don't remove it, TS won't complain but it would silently break reordering
  position: true,
  hashedLink: true,
  locations: true,
  destinationCalendar: true,
  userId: true,
  team: {
    select: {
      id: true,
      name: true,
      slug: true,
      // logo: true, // Skipping to avoid 4mb limit
      bio: true,
      hideBranding: true,
    },
  },
  metadata: true,
  users: {
    select: userSelect,
  },
  children: {
    include: {
      users: {
        select: userSelect,
      },
    },
  },
  parentId: true,
  hosts: {
    select: {
      user: {
        select: userSelect,
      },
    },
  },
  seatsPerTimeSlot: true,
  ...baseEventTypeSelect,
});

export const compareMembership = (mship1: MembershipRole, mship2: MembershipRole) => {
  const mshipToNumber = (mship: MembershipRole) =>
    Object.keys(MembershipRole).findIndex((mmship) => mmship === mship);
  return mshipToNumber(mship1) > mshipToNumber(mship2);
};

export const getByViewerHandler = async ({ ctx, input }: GetByViewerOptions) => {
  const { prisma } = ctx;

  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getByViewer:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      startTime: true,
      endTime: true,
      bufferTime: true,
      avatar: true,
      organizationId: true,
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              metadata: true,
              members: {
                select: {
                  userId: true,
                },
              },
              eventTypes: {
                select: eventTypeSelect,
                orderBy: [
                  {
                    position: "desc",
                  },
                  {
                    id: "asc",
                  },
                ],
              },
            },
          },
        },
      },
      eventTypes: {
        where: {
          team: null,
          userId: getPrismaWhereUserIdFromFilter(ctx.user.id, input?.filters),
        },
        select: eventTypeSelect,
        orderBy: [
          {
            position: "desc",
          },
          {
            id: "asc",
          },
        ],
      },
    },
  });

  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const mapEventType = (eventType: (typeof user.eventTypes)[number]) => ({
    ...eventType,
    safeDescription: markdownToSafeHTML(eventType.description),
    users: !!eventType.hosts?.length ? eventType.hosts.map((host) => host.user) : eventType.users,
    metadata: eventType.metadata ? EventTypeMetaDataSchema.parse(eventType.metadata) : undefined,
  });

  const userEventTypes = user.eventTypes.map(mapEventType);

  type EventTypeGroup = {
    teamId?: number | null;
    membershipRole?: MembershipRole | null;
    profile: {
      slug: (typeof user)["username"];
      name: (typeof user)["name"];
      image?: string;
    };
    metadata: {
      membershipCount: number;
      readOnly: boolean;
    };
    eventTypes: typeof userEventTypes;
  };

  let eventTypeGroups: EventTypeGroup[] = [];

  const unmanagedEventTypes = userEventTypes.filter(
    (evType) => evType.schedulingType !== SchedulingType.MANAGED
  );

  const image = user?.username ? `${CAL_URL}/${user.username}/avatar.png` : undefined;

  eventTypeGroups.push({
    teamId: null,
    membershipRole: null,
    profile: {
      slug: user.username,
      name: user.name,
      image,
    },
    eventTypes: orderBy(unmanagedEventTypes, ["position", "id"], ["desc", "asc"]),
    metadata: {
      membershipCount: 1,
      readOnly: false,
    },
  });

  const teamMemberships = user.teams.map((membership) => ({
    teamId: membership.team.id,
    membershipRole: membership.role,
  }));

  const filterTeamsEventTypesBasedOnInput = (eventType: ReturnType<typeof mapEventType>) => {
    if (!input?.filters || !hasFilter(input?.filters)) {
      return true;
    }
    return input?.filters?.teamIds?.includes(eventType?.team?.id || 0) ?? false;
  };

  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    user.teams
      .filter((mmship) => {
        const metadata = teamMetadataSchema.parse(mmship.team.metadata);
        return !metadata?.isOrganization;
      })
      .map((membership) => {
        const orgMembership = teamMemberships.find(
          (teamM) => teamM.teamId === membership.team.parentId
        )?.membershipRole;
        return {
          teamId: membership.team.id,
          membershipRole:
            orgMembership && compareMembership(orgMembership, membership.role)
              ? orgMembership
              : membership.role,
          profile: {
            name: membership.team.name,
            image: `${CAL_URL}/team/${membership.team.slug}/avatar.png`,
            slug: membership.team.slug
              ? !membership.team.parentId
                ? `team/${membership.team.slug}`
                : "" + membership.team.slug
              : null,
          },
          metadata: {
            membershipCount: membership.team.members.length,
            readOnly:
              membership.role ===
              (membership.team.parentId
                ? orgMembership && compareMembership(orgMembership, membership.role)
                  ? orgMembership
                  : MembershipRole.MEMBER
                : MembershipRole.MEMBER),
          },
          eventTypes: membership.team.eventTypes
            .map(mapEventType)
            .filter(filterTeamsEventTypesBasedOnInput)
            .filter((evType) => evType.userId === null || evType.userId === ctx.user.id)
            .filter((evType) =>
              membership.role === MembershipRole.MEMBER
                ? evType.schedulingType !== SchedulingType.MANAGED
                : true
            ),
        };
      })
  );

  const bookerUrl = await getBookerUrl(user);
  return {
    // don't display event teams without event types,
    eventTypeGroups: eventTypeGroups.filter((groupBy) => !!groupBy.eventTypes?.length),
    // so we can show a dropdown when the user has teams
    profiles: eventTypeGroups.map((group) => ({
      ...group.profile,
      ...group.metadata,
      teamId: group.teamId,
      membershipRole: group.membershipRole,
      image: `${bookerUrl}/${group.profile.slug}/avatar.png`,
    })),
  };
};

export function getPrismaWhereUserIdFromFilter(
  userId: number,
  filters: NonNullable<TEventTypeInputSchema>["filters"] | undefined
) {
  if (!filters || !hasFilter(filters)) {
    return userId;
  } else if (filters.userIds?.[0] === userId) {
    return userId;
  }
  return 0;
}
