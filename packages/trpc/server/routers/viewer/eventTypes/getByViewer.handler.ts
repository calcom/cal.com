import { MembershipRole, Prisma, SchedulingType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { orderBy } from "lodash";

import { CAL_URL } from "@calcom/lib/constants";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { baseEventTypeSelect, baseUserSelect } from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const getByViewerHandler = async ({ ctx }: GetByViewerOptions) => {
  const { prisma } = ctx;
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
      select: baseUserSelect,
    },
    children: {
      include: {
        users: true,
      },
    },
    hosts: {
      select: {
        user: {
          select: baseUserSelect,
        },
      },
    },
    seatsPerTimeSlot: true,
    ...baseEventTypeSelect,
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
  // backwards compatibility, TMP:
  const typesRaw = (
    await prisma.eventType.findMany({
      where: {
        userId: ctx.user.id,
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
    })
  ).map(mapEventType);

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
  const eventTypesHashMap = userEventTypes.concat(typesRaw).reduce((hashMap, newItem) => {
    const oldItem = hashMap[newItem.id];
    hashMap[newItem.id] = { ...oldItem, ...newItem };
    return hashMap;
  }, {} as Record<number, EventTypeGroup["eventTypes"][number]>);
  const mergedEventTypes = Object.values(eventTypesHashMap)
    .map((eventType) => eventType)
    .filter((evType) => evType.schedulingType !== SchedulingType.MANAGED);
  eventTypeGroups.push({
    teamId: null,
    membershipRole: null,
    profile: {
      slug: user.username,
      name: user.name,
      image: user.avatar || undefined,
    },
    eventTypes: orderBy(mergedEventTypes, ["position", "id"], ["desc", "asc"]),
    metadata: {
      membershipCount: 1,
      readOnly: false,
    },
  });

  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    user.teams.map((membership) => ({
      teamId: membership.team.id,
      membershipRole: membership.role,
      profile: {
        name: membership.team.name,
        image: `${CAL_URL}/team/${membership.team.slug}/avatar.png`,
        slug: membership.team.slug ? "team/" + membership.team.slug : null,
      },
      metadata: {
        membershipCount: membership.team.members.length,
        readOnly: membership.role === MembershipRole.MEMBER,
      },
      eventTypes: membership.team.eventTypes
        .map(mapEventType)
        .filter((evType) => evType.userId === null || evType.userId === ctx.user.id)
        .filter((evType) =>
          membership.role === MembershipRole.MEMBER ? evType.schedulingType !== SchedulingType.MANAGED : true
        ),
    }))
  );
  return {
    // don't display event teams without event types,
    eventTypeGroups: eventTypeGroups.filter((groupBy) => !!groupBy.eventTypes?.length),
    // so we can show a dropdown when the user has teams
    profiles: eventTypeGroups.map((group) => ({
      teamId: group.teamId,
      membershipRole: group.membershipRole,
      ...group.profile,
      ...group.metadata,
    })),
  };
};
