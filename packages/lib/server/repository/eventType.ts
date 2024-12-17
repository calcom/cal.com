import type { EventType as PrismaEventType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { Ensure } from "@calcom/types/utils";

import { TRPCError } from "@trpc/server";

import { safeStringify } from "../../safeStringify";
import { eventTypeSelect } from "../eventTypeSelect";
import { LookupTarget, ProfileRepository } from "./profile";

const log = logger.getSubLogger({ prefix: ["repository/eventType"] });
type NotSupportedProps = "locations";
type IEventType = Ensure<
  Partial<
    Omit<Prisma.EventTypeCreateInput, NotSupportedProps> & {
      userId: PrismaEventType["userId"];
      profileId: PrismaEventType["profileId"];
      teamId: PrismaEventType["teamId"];
      parentId: PrismaEventType["parentId"];
      scheduleId: PrismaEventType["scheduleId"];
    }
  >,
  "title" | "slug" | "length"
>;

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
});

export class EventTypeRepository {
  private static generateCreateEventTypeData = (eventTypeCreateData: IEventType) => {
    const {
      userId,
      profileId,
      teamId,
      parentId,
      scheduleId,
      bookingLimits,
      recurringEvent,
      metadata,
      bookingFields,
      durationLimits,
      ...rest
    } = eventTypeCreateData;

    return {
      ...rest,
      ...(userId ? { owner: { connect: { id: userId } } } : null),
      ...(profileId
        ? {
            profile: {
              connect: {
                id: profileId,
              },
            },
          }
        : null),
      ...(teamId ? { team: { connect: { id: teamId } } } : null),
      ...(parentId ? { parent: { connect: { id: parentId } } } : null),
      ...(scheduleId ? { schedule: { connect: { id: scheduleId } } } : null),
      ...(metadata ? { metadata: metadata } : null),
      ...(bookingLimits
        ? {
            bookingLimits,
          }
        : null),
      ...(recurringEvent
        ? {
            recurringEvent,
          }
        : null),
      ...(bookingFields
        ? {
            bookingFields,
          }
        : null),
      ...(durationLimits
        ? {
            durationLimits,
          }
        : null),
    };
  };

  static async create(data: IEventType) {
    return await prisma.eventType.create({
      data: this.generateCreateEventTypeData(data),
    });
  }

  static async createMany(data: IEventType[]) {
    return await prisma.eventType.createMany({
      data: data.map((d) => this.generateCreateEventTypeData(d)),
    });
  }

  static async findAllByUpId(
    { upId, userId }: { upId: string; userId: number },
    {
      orderBy,
      where = {},
      cursor: cursorId,
      limit,
    }: {
      orderBy?: Prisma.EventTypeOrderByWithRelationInput[];
      where?: Prisma.EventTypeWhereInput;
      cursor?: number | null;
      limit?: number | null;
    } = {}
  ) {
    if (!upId) return [];
    const lookupTarget = ProfileRepository.getLookupTarget(upId);
    const profileId = lookupTarget.type === LookupTarget.User ? null : lookupTarget.id;
    const select = {
      ...eventTypeSelect,
      hashedLink: true,
      users: { select: userSelect },
      children: {
        include: {
          users: { select: userSelect },
        },
      },
      hosts: {
        include: {
          user: { select: userSelect },
        },
      },
    };

    log.debug(
      "findAllByUpId",
      safeStringify({
        upId,
        orderBy,
        argumentWhere: where,
      })
    );

    const cursor = cursorId ? { id: cursorId } : undefined;
    const take = limit ? limit + 1 : undefined; // We take +1 as it'll be used for the next cursor

    if (!profileId) {
      // Lookup is by userId
      return await prisma.eventType.findMany({
        where: {
          userId: lookupTarget.id,
          ...where,
        },
        select,
        cursor,
        take,
        orderBy,
      });
    }

    const profile = await ProfileRepository.findById(profileId);
    if (profile?.movedFromUser) {
      // Because the user has been moved to this profile, we need to get all user events except those that belong to some other profile
      // This is because those event-types that are created after moving to profile would have profileId but existing event-types would have profileId set to null
      return await prisma.eventType.findMany({
        where: {
          OR: [
            // Existing events
            {
              userId: profile.movedFromUser.id,
              profileId: null,
            },
            // New events
            {
              profileId,
            },
            // Fetch children event-types by userId because profileId is wrong
            {
              userId,
              parentId: {
                not: null,
              },
            },
          ],
          ...where,
        },
        select,
        cursor,
        take,
        orderBy,
      });
    } else {
      return await prisma.eventType.findMany({
        where: {
          OR: [
            {
              profileId,
            },
            // Fetch children event-types by userId because profileId is wrong
            {
              userId: userId,
              parentId: {
                not: null,
              },
            },
          ],
          ...where,
        },
        select,
        cursor,
        take,
        orderBy,
      });
    }
  }

  static async findAllByUpIdWithMinimalData(
    { upId, userId }: { upId: string; userId: number },
    {
      orderBy,
      where = {},
      cursor: cursorId,
      limit,
    }: {
      orderBy?: Prisma.EventTypeOrderByWithRelationInput[];
      where?: Prisma.EventTypeWhereInput;
      cursor?: number | null;
      limit?: number | null;
    } = {}
  ) {
    if (!upId) return [];
    const lookupTarget = ProfileRepository.getLookupTarget(upId);
    const profileId = lookupTarget.type === LookupTarget.User ? null : lookupTarget.id;
    const select = {
      ...eventTypeSelect,
      hashedLink: true,
    };

    log.debug(
      "findAllByUpIdWithMinimalData",
      safeStringify({
        upId,
        orderBy,
        argumentWhere: where,
      })
    );

    const cursor = cursorId ? { id: cursorId } : undefined;
    const take = limit ? limit + 1 : undefined; // We take +1 as it'll be used for the next cursor

    if (!profileId) {
      // Lookup is by userId
      return await prisma.eventType.findMany({
        where: {
          userId: lookupTarget.id,
          ...where,
        },
        select,
        cursor,
        take,
        orderBy,
      });
    }

    const profile = await ProfileRepository.findById(profileId);
    if (profile?.movedFromUser) {
      // Because the user has been moved to this profile, we need to get all user events except those that belong to some other profile
      // This is because those event-types that are created after moving to profile would have profileId but existing event-types would have profileId set to null
      return await prisma.eventType.findMany({
        where: {
          OR: [
            // Existing events
            {
              userId: profile.movedFromUser.id,
              profileId: null,
            },
            // New events
            {
              profileId,
            },
            // Fetch children event-types by userId because profileId is wrong
            {
              userId,
              parentId: {
                not: null,
              },
            },
          ],
          ...where,
        },
        select,
        cursor,
        take,
        orderBy,
      });
    } else {
      return await prisma.eventType.findMany({
        where: {
          OR: [
            {
              profileId,
            },
            // Fetch children event-types by userId because profileId is wrong
            {
              userId: userId,
              parentId: {
                not: null,
              },
            },
          ],
          ...where,
        },
        select,
        cursor,
        take,
        orderBy,
      });
    }
  }

  static async findTeamEventTypes({
    teamId,
    parentId,
    userId,
    limit,
    cursor,
    orderBy,
    where = {},
  }: {
    teamId: number;
    parentId?: number | null;
    userId: number;
    limit?: number | null;
    cursor?: number | null;
    orderBy?: Prisma.EventTypeOrderByWithRelationInput[];
    where?: Prisma.EventTypeWhereInput;
  }) {
    const userSelect = Prisma.validator<Prisma.UserSelect>()({
      name: true,
      avatarUrl: true,
      username: true,
      id: true,
    });

    const select = {
      ...eventTypeSelect,
      hashedLink: true,
      users: { select: userSelect, take: 5 },
      children: {
        include: {
          users: { select: userSelect, take: 5 },
        },
      },
      hosts: {
        include: {
          user: { select: userSelect },
        },
        take: 5,
      },
    };

    const teamMembership = await prisma.membership.findFirst({
      where: {
        OR: [
          {
            teamId,
            userId,
            accepted: true,
          },
          {
            team: {
              parent: {
                ...(parentId ? { id: parentId } : {}),
                members: {
                  some: {
                    userId,
                    accepted: true,
                    role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (!teamMembership) throw new TRPCError({ code: "UNAUTHORIZED" });

    return await prisma.eventType.findMany({
      where: {
        teamId,
        ...where,
      },
      select,
      cursor: cursor ? { id: cursor } : undefined,
      take: limit ? limit + 1 : undefined, // We take +1 as itll be used for the next cursor
      orderBy,
    });
  }

  static async findAllByUserId({ userId }: { userId: number }) {
    return await prisma.eventType.findMany({
      where: {
        userId,
      },
    });
  }

  static async findById({ id, userId }: { id: number; userId: number }) {
    const userSelect = Prisma.validator<Prisma.UserSelect>()({
      name: true,
      avatarUrl: true,
      username: true,
      id: true,
      email: true,
      locale: true,
      defaultScheduleId: true,
    });

    const CompleteEventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      isInstantEvent: true,
      instantMeetingExpiryTimeOffsetInSeconds: true,
      instantMeetingParameters: true,
      aiPhoneCallConfig: true,
      offsetStart: true,
      hidden: true,
      locations: true,
      eventName: true,
      customInputs: true,
      timeZone: true,
      periodType: true,
      metadata: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      lockTimeZoneToggleOnBookingPage: true,
      requiresConfirmation: true,
      requiresConfirmationWillBlockSlot: true,
      requiresBookerEmailVerification: true,
      autoTranslateDescriptionEnabled: true,
      fieldTranslations: {
        select: {
          translatedText: true,
          targetLocale: true,
          field: true,
        },
      },
      recurringEvent: true,
      hideCalendarNotes: true,
      hideCalendarEventDetails: true,
      disableGuests: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      slotInterval: true,
      hashedLink: true,
      eventTypeColor: true,
      bookingLimits: true,
      onlyShowFirstAvailableSlot: true,
      durationLimits: true,
      assignAllTeamMembers: true,
      assignRRMembersUsingSegment: true,
      rrSegmentQueryValue: true,
      isRRWeightsEnabled: true,
      rescheduleWithSameRoundRobinHost: true,
      successRedirectUrl: true,
      forwardParamsSuccessRedirect: true,
      currency: true,
      bookingFields: true,
      useEventTypeDestinationCalendarEmail: true,
      owner: {
        select: {
          id: true,
        },
      },
      parent: {
        select: {
          id: true,
          teamId: true,
        },
      },
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          parent: {
            select: {
              slug: true,
              organizationSettings: {
                select: {
                  lockEventTypeCreationForUsers: true,
                },
              },
            },
          },
          members: {
            select: {
              role: true,
              accepted: true,
              user: {
                select: {
                  ...userSelect,
                  eventTypes: {
                    select: {
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      users: {
        select: userSelect,
      },
      schedulingType: true,
      schedule: {
        select: {
          id: true,
          name: true,
        },
      },
      instantMeetingSchedule: {
        select: {
          id: true,
          name: true,
        },
      },
      hosts: {
        select: {
          isFixed: true,
          userId: true,
          priority: true,
          weight: true,
          scheduleId: true,
        },
      },
      userId: true,
      price: true,
      children: {
        select: {
          owner: {
            select: {
              avatarUrl: true,
              name: true,
              username: true,
              email: true,
              id: true,
            },
          },
          hidden: true,
          slug: true,
        },
      },
      destinationCalendar: true,
      seatsPerTimeSlot: true,
      seatsShowAttendees: true,
      seatsShowAvailabilityCount: true,
      webhooks: {
        select: {
          id: true,
          subscriberUrl: true,
          payloadTemplate: true,
          active: true,
          eventTriggers: true,
          secret: true,
          eventTypeId: true,
        },
      },
      workflows: {
        include: {
          workflow: {
            select: {
              name: true,
              id: true,
              trigger: true,
              time: true,
              timeUnit: true,
              userId: true,
              teamId: true,
              team: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  members: true,
                },
              },
              activeOn: {
                select: {
                  eventType: {
                    select: {
                      id: true,
                      title: true,
                      parentId: true,
                      _count: {
                        select: {
                          children: true,
                        },
                      },
                    },
                  },
                },
              },
              steps: true,
            },
          },
        },
      },
      secondaryEmailId: true,
      maxLeadThreshold: true,
    });

    return await prisma.eventType.findFirst({
      where: {
        AND: [
          {
            OR: [
              {
                users: {
                  some: {
                    id: userId,
                  },
                },
              },
              {
                team: {
                  members: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
              {
                userId: userId,
              },
            ],
          },
          {
            id,
          },
        ],
      },
      select: CompleteEventTypeSelect,
    });
  }

  static async findByIdMinimal({ id }: { id: number }) {
    return await prisma.eventType.findUnique({
      where: {
        id,
      },
    });
  }

  static async findByIdIncludeHostsAndTeam({ id }: { id: number }) {
    return await prisma.eventType.findUnique({
      where: {
        id,
      },
      include: {
        hosts: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            weight: true,
            priority: true,
            createdAt: true,
          },
        },
        team: {
          select: {
            parentId: true,
          },
        },
      },
    });
  }

  static async findAllByTeamIdIncludeManagedEventTypes({ teamId }: { teamId?: number }) {
    return await prisma.eventType.findMany({
      where: {
        OR: [
          {
            teamId,
          },
          {
            parent: {
              teamId,
            },
          },
        ],
      },
    });
  }
}
