import type { EventType as PrismaEventType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { prisma, availabilityUserSelect } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { EventTypeMetaDataSchema, rrSegmentQueryValueSchema } from "@calcom/prisma/zod-utils";
import type { Ensure } from "@calcom/types/utils";

import { TRPCError } from "@trpc/server";

import { safeStringify } from "../../safeStringify";
import { eventTypeSelect } from "../eventTypeSelect";
import { MembershipRepository } from "./membership";
import { LookupTarget, ProfileRepository } from "./profile";
import type { UserWithLegacySelectedCalendars } from "./user";
import { withSelectedCalendars } from "./user";

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

type UserWithSelectedCalendars<TSelectedCalendar extends { eventTypeId: number | null }> = {
  allSelectedCalendars: TSelectedCalendar[];
};

type HostWithLegacySelectedCalendars<
  TSelectedCalendar extends { eventTypeId: number | null },
  THost,
  TUser
> = THost & {
  user: UserWithLegacySelectedCalendars<TSelectedCalendar, TUser>;
};

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
});

function hostsWithSelectedCalendars<TSelectedCalendar extends { eventTypeId: number | null }, THost, TUser>(
  hosts: HostWithLegacySelectedCalendars<TSelectedCalendar, THost, TUser>[]
) {
  return hosts.map((host) => ({
    ...host,
    user: withSelectedCalendars(host.user),
  }));
}

function usersWithSelectedCalendars<
  TSelectedCalendar extends { eventTypeId: number | null },
  TUser extends { selectedCalendars: TSelectedCalendar[] }
>(users: UserWithLegacySelectedCalendars<TSelectedCalendar, TUser>[]) {
  return users.map((user) => withSelectedCalendars(user));
}

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

  static async findTitleById({ id }: { id: number }) {
    return await prisma.eventType.findUnique({
      where: {
        id,
      },
      select: {
        title: true,
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
      isPlatformManaged: true,
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
      requiresConfirmationForFreeEmail: true,
      canSendCalVideoTranscriptionEmails: true,
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
      disableCancelling: true,
      disableRescheduling: true,
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
      allowReschedulingPastBookings: true,
      hideOrganizerEmail: true,
      assignRRMembersUsingSegment: true,
      rrSegmentQueryValue: true,
      isRRWeightsEnabled: true,
      rescheduleWithSameRoundRobinHost: true,
      successRedirectUrl: true,
      forwardParamsSuccessRedirect: true,
      currency: true,
      bookingFields: true,
      useEventTypeDestinationCalendarEmail: true,
      customReplyToEmail: true,
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
      includeNoShowInRRCalculation: true,
      useEventLevelSelectedCalendars: true,
    });

    // This is more efficient than using a complex join with team.members in the query
    const userTeamIds = await MembershipRepository.findUserTeamIds({ userId });

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
                AND: [{ teamId: { not: null } }, { teamId: { in: userTeamIds } }],
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
    const eventType = await prisma.eventType.findUnique({
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
                credentials: {
                  select: credentialForCalendarServiceSelect,
                },
                selectedCalendars: true,
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
            rrResetInterval: true,
          },
        },
      },
    });

    if (!eventType) {
      return eventType;
    }

    return {
      ...eventType,
      hosts: hostsWithSelectedCalendars(eventType.hosts),
    };
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

  static async findForSlots({ id, useSql = true }: { id: number; useSql?: boolean }) {
    const measureExecutionTime = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
      const start = performance.now();
      const result = await fn();
      const end = performance.now();
      return [result, end - start];
    };

    const prismaQueryTime = 0;
    const sqlQueryTime = 0;

    try {
      const executePrismaQuery = async () => {
        return await prisma.eventType.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            slug: true,
            minimumBookingNotice: true,
            length: true,
            offsetStart: true,
            seatsPerTimeSlot: true,
            timeZone: true,
            slotInterval: true,
            beforeEventBuffer: true,
            afterEventBuffer: true,
            bookingLimits: true,
            durationLimits: true,
            assignAllTeamMembers: true,
            schedulingType: true,
            periodType: true,
            periodStartDate: true,
            periodEndDate: true,
            onlyShowFirstAvailableSlot: true,
            allowReschedulingPastBookings: true,
            hideOrganizerEmail: true,
            periodCountCalendarDays: true,
            rescheduleWithSameRoundRobinHost: true,
            periodDays: true,
            metadata: true,
            assignRRMembersUsingSegment: true,
            rrSegmentQueryValue: true,
            isRRWeightsEnabled: true,
            maxLeadThreshold: true,
            includeNoShowInRRCalculation: true,
            useEventLevelSelectedCalendars: true,
            team: {
              select: {
                id: true,
                bookingLimits: true,
                includeManagedEventsInLimits: true,
                parentId: true,
                rrResetInterval: true,
              },
            },
            parent: {
              select: {
                team: {
                  select: {
                    id: true,
                    bookingLimits: true,
                    includeManagedEventsInLimits: true,
                  },
                },
              },
            },
            schedule: {
              select: {
                id: true,
                availability: {
                  select: {
                    date: true,
                    startTime: true,
                    endTime: true,
                    days: true,
                  },
                },
                timeZone: true,
              },
            },
            availability: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
                days: true,
              },
            },
            hosts: {
              select: {
                isFixed: true,
                createdAt: true,
                weight: true,
                priority: true,
                user: {
                  select: {
                    credentials: { select: credentialForCalendarServiceSelect },
                    ...availabilityUserSelect,
                  },
                },
                schedule: {
                  select: {
                    availability: {
                      select: {
                        date: true,
                        startTime: true,
                        endTime: true,
                        days: true,
                      },
                    },
                    timeZone: true,
                    id: true,
                  },
                },
              },
            },
            users: {
              select: {
                credentials: { select: credentialForCalendarServiceSelect },
                ...availabilityUserSelect,
              },
            },
          },
        });
      };

      const executeRawSQLQuery = async () => {
        const eventTypeQuery = Prisma.sql`
          WITH 
          event_type AS (
            SELECT 
              et.id, et.slug, et."minimumBookingNotice", et.length, et."offsetStart", 
              et."seatsPerTimeSlot", et."timeZone", et."slotInterval", et."beforeEventBuffer", 
              et."afterEventBuffer", et."bookingLimits", et."durationLimits", et."assignAllTeamMembers", 
              et."schedulingType", et."periodType", et."periodStartDate", et."periodEndDate", 
              et."onlyShowFirstAvailableSlot", et."allowReschedulingPastBookings", et."hideOrganizerEmail", 
              et."periodCountCalendarDays", et."rescheduleWithSameRoundRobinHost", et."periodDays", 
              et.metadata, et."assignRRMembersUsingSegment", et."rrSegmentQueryValue", et."isRRWeightsEnabled", 
              et."maxLeadThreshold", et."includeNoShowInRRCalculation", et."useEventLevelSelectedCalendars"
            FROM "EventType" et
            WHERE et.id = ${id}
          ),
          team_data AS (
            SELECT 
              t.id, t."bookingLimits", t."includeManagedEventsInLimits", t."parentId", t."rrResetInterval"
            FROM "Team" t
            JOIN event_type et ON t.id = et."teamId"
          ),
          parent_team_data AS (
            SELECT 
              pt.id, pt."bookingLimits", pt."includeManagedEventsInLimits"
            FROM "Team" pt
            JOIN "EventType" pet ON pet.id = (SELECT "parentId" FROM "EventType" WHERE id = ${id})
            JOIN "Team" t ON t.id = pet."teamId"
            WHERE pet.id = (SELECT "parentId" FROM "EventType" WHERE id = ${id})
          ),
          schedule_data AS (
            SELECT 
              s.id, s."timeZone",
              COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'date', a.date,
                      'startTime', a."startTime",
                      'endTime', a."endTime",
                      'days', a.days
                    )
                  )
                  FROM "Availability" a
                  WHERE a."scheduleId" = s.id
                ),
                '[]'::jsonb
              ) AS availability
            FROM "Schedule" s
            JOIN event_type et ON s.id = et."scheduleId"
          ),
          availability_data AS (
            SELECT 
              jsonb_agg(
                jsonb_build_object(
                  'date', a.date,
                  'startTime', a."startTime",
                  'endTime', a."endTime",
                  'days', a.days
                )
              ) AS availability
            FROM "Availability" a
            JOIN event_type et ON a."eventTypeId" = et.id
          ),
          hosts_data AS (
            SELECT 
              jsonb_agg(
                jsonb_build_object(
                  'isFixed', h."isFixed",
                  'createdAt', h."createdAt",
                  'weight', h.weight,
                  'priority', h.priority,
                  'user', (
                    SELECT jsonb_build_object(
                      'id', u.id,
                      'timeZone', u."timeZone",
                      'email', u.email,
                      'bufferTime', u."bufferTime",
                      'startTime', u."startTime",
                      'username', u.username,
                      'endTime', u."endTime",
                      'timeFormat', u."timeFormat",
                      'defaultScheduleId', u."defaultScheduleId",
                      'schedules', (
                        SELECT COALESCE(
                          jsonb_agg(
                            jsonb_build_object(
                              'id', s.id,
                              'timeZone', s."timeZone",
                              'availability', (
                                SELECT COALESCE(
                                  jsonb_agg(
                                    jsonb_build_object(
                                      'date', a.date,
                                      'startTime', a."startTime",
                                      'endTime', a."endTime",
                                      'days', a.days
                                    )
                                  ),
                                  '[]'::jsonb
                                )
                                FROM "Availability" a
                                WHERE a."scheduleId" = s.id
                              )
                            )
                          ),
                          '[]'::jsonb
                        )
                        FROM "Schedule" s
                        WHERE s."userId" = u.id
                      ),
                      'availability', (
                        SELECT COALESCE(
                          jsonb_agg(
                            jsonb_build_object(
                              'date', a.date,
                              'startTime', a."startTime",
                              'endTime', a."endTime",
                              'days', a.days
                            )
                          ),
                          '[]'::jsonb
                        )
                        FROM "Availability" a
                        WHERE a."userId" = u.id AND a."eventTypeId" IS NULL
                      ),
                      'selectedCalendars', (
                        SELECT COALESCE(
                          jsonb_agg(
                            jsonb_build_object(
                              'integration', sc.integration,
                              'externalId', sc."externalId",
                              'credentialId', sc."credentialId",
                              'eventTypeId', sc."eventTypeId"
                            )
                          ),
                          '[]'::jsonb
                        )
                        FROM "SelectedCalendar" sc
                        WHERE sc."userId" = u.id
                      ),
                      'travelSchedules', (
                        SELECT COALESCE(
                          jsonb_agg(
                            jsonb_build_object(
                              'id', ts.id,
                              'startDate', ts."startDate",
                              'endDate', ts."endDate",
                              'timeZone', ts."timeZone"
                            )
                          ),
                          '[]'::jsonb
                        )
                        FROM "TravelSchedule" ts
                        WHERE ts."userId" = u.id
                      ),
                      'credentials', (
                        SELECT COALESCE(
                          jsonb_agg(
                            jsonb_build_object(
                              'id', c.id,
                              'type', c.type,
                              'userId', c."userId",
                              'user', jsonb_build_object('email', uc.email),
                              'teamId', c."teamId",
                              'key', c.key,
                              'invalid', c.invalid,
                              'delegationCredentialId', c."delegationCredentialId",
                              'appId', c."appId"
                            )
                          ),
                          '[]'::jsonb
                        )
                        FROM "Credential" c
                        LEFT JOIN "users" uc ON c."userId" = uc.id
                        WHERE c."userId" = u.id
                      )
                    )
                    FROM "users" u
                    WHERE u.id = h."userId"
                  ),
                  'schedule', (
                    SELECT jsonb_build_object(
                      'id', s.id,
                      'timeZone', s."timeZone",
                      'availability', (
                        SELECT COALESCE(
                          jsonb_agg(
                            jsonb_build_object(
                              'date', a.date,
                              'startTime', a."startTime",
                              'endTime', a."endTime",
                              'days', a.days
                            )
                          ),
                          '[]'::jsonb
                        )
                        FROM "Availability" a
                        WHERE a."scheduleId" = s.id
                      )
                    )
                    FROM "Schedule" s
                    WHERE s.id = h."scheduleId"
                  )
                )
              ) AS hosts
            FROM "Host" h
            WHERE h."eventTypeId" = ${id}
          ),
          users_data AS (
            SELECT 
              jsonb_agg(
                jsonb_build_object(
                  'id', u.id,
                  'timeZone', u."timeZone",
                  'email', u.email,
                  'bufferTime', u."bufferTime",
                  'startTime', u."startTime",
                  'username', u.username,
                  'endTime', u."endTime",
                  'timeFormat', u."timeFormat",
                  'defaultScheduleId', u."defaultScheduleId",
                  'schedules', (
                    SELECT COALESCE(
                      jsonb_agg(
                        jsonb_build_object(
                          'id', s.id,
                          'timeZone', s."timeZone",
                          'availability', (
                            SELECT COALESCE(
                              jsonb_agg(
                                jsonb_build_object(
                                  'date', a.date,
                                  'startTime', a."startTime",
                                  'endTime', a."endTime",
                                  'days', a.days
                                )
                              ),
                              '[]'::jsonb
                            )
                            FROM "Availability" a
                            WHERE a."scheduleId" = s.id
                          )
                        )
                      ),
                      '[]'::jsonb
                    )
                    FROM "Schedule" s
                    WHERE s."userId" = u.id
                  ),
                  'availability', (
                    SELECT COALESCE(
                      jsonb_agg(
                        jsonb_build_object(
                          'date', a.date,
                          'startTime', a."startTime",
                          'endTime', a."endTime",
                          'days', a.days
                        )
                      ),
                      '[]'::jsonb
                    )
                    FROM "Availability" a
                    WHERE a."userId" = u.id AND a."eventTypeId" IS NULL
                  ),
                  'selectedCalendars', (
                    SELECT COALESCE(
                      jsonb_agg(
                        jsonb_build_object(
                          'integration', sc.integration,
                          'externalId', sc."externalId",
                          'credentialId', sc."credentialId",
                          'eventTypeId', sc."eventTypeId"
                        )
                      ),
                      '[]'::jsonb
                    )
                    FROM "SelectedCalendar" sc
                    WHERE sc."userId" = u.id
                  ),
                  'travelSchedules', (
                    SELECT COALESCE(
                      jsonb_agg(
                        jsonb_build_object(
                          'id', ts.id,
                          'startDate', ts."startDate",
                          'endDate', ts."endDate",
                          'timeZone', ts."timeZone"
                        )
                      ),
                      '[]'::jsonb
                    )
                    FROM "TravelSchedule" ts
                    WHERE ts."userId" = u.id
                  ),
                  'credentials', (
                    SELECT COALESCE(
                      jsonb_agg(
                        jsonb_build_object(
                          'id', c.id,
                          'type', c.type,
                          'userId', c."userId",
                          'user', jsonb_build_object('email', uc.email),
                          'teamId', c."teamId",
                          'key', c.key,
                          'invalid', c.invalid,
                          'delegationCredentialId', c."delegationCredentialId",
                          'appId', c."appId"
                        )
                      ),
                      '[]'::jsonb
                    )
                    FROM "Credential" c
                    LEFT JOIN "users" uc ON c."userId" = uc.id
                    WHERE c."userId" = u.id
                  )
                )
              ) AS users
            FROM "users" u
            JOIN "_EventTypeToUser" etu ON etu."B" = u.id
            WHERE etu."A" = ${id}
          )
          SELECT 
            et.*,
            (SELECT row_to_json(t) FROM team_data t) AS team,
            (SELECT jsonb_build_object('team', row_to_json(pt)) FROM parent_team_data pt) AS parent,
            (SELECT row_to_json(s) FROM schedule_data s) AS schedule,
            (SELECT availability FROM availability_data) AS availability,
            (SELECT hosts FROM hosts_data) AS hosts,
            (SELECT users FROM users_data) AS users
          FROM event_type et;
        `;

        const eventTypeResult = await prisma.$queryRaw<any[]>(eventTypeQuery);
        return eventTypeResult.length > 0 ? eventTypeResult[0] : null;
      };

      const [prismaResult, prismaTime] = await measureExecutionTime(executePrismaQuery);
      const [rawSQLResult, rawSQLTime] = await measureExecutionTime(executeRawSQLQuery);

      const improvement = ((prismaTime - rawSQLTime) / prismaTime) * 100;
      log.info("Performance comparison", {
        prismaQueryTime: prismaTime.toFixed(2),
        rawSQLQueryTime: rawSQLTime.toFixed(2),
        improvement: improvement.toFixed(2),
      });

      console.log(
        `Performance: Prisma=${prismaTime.toFixed(2)}ms, SQL=${rawSQLTime.toFixed(
          2
        )}ms, Improvement=${improvement.toFixed(2)}%`
      );

      const eventType = rawSQLResult;

      if (!eventType) {
        return eventType;
      }

      if (typeof eventType.metadata === "string") {
        eventType.metadata = JSON.parse(eventType.metadata);
      }
      if (typeof eventType.rrSegmentQueryValue === "string") {
        eventType.rrSegmentQueryValue = JSON.parse(eventType.rrSegmentQueryValue);
      }
      if (typeof eventType.bookingLimits === "string") {
        eventType.bookingLimits = JSON.parse(eventType.bookingLimits);
      }
      if (typeof eventType.durationLimits === "string") {
        eventType.durationLimits = JSON.parse(eventType.durationLimits);
      }

      eventType.hosts = Array.isArray(eventType.hosts) ? eventType.hosts : [];
      eventType.users = Array.isArray(eventType.users) ? eventType.users : [];

      const restructuredHosts = eventType.hosts.map((host: any) => {
        const user = {
          ...host.user,
          id: host.user.id,
          email: host.user.email,
          username: host.user.username || "",
          name: host.user.name || "",
          timeZone: host.user.timeZone || "UTC",
          bufferTime: host.user.bufferTime || 0,
          startTime: host.user.startTime || 0,
          endTime: host.user.endTime || 0,
          timeFormat: host.user.timeFormat || null,
          defaultScheduleId: host.user.defaultScheduleId || null,
          schedules: host.user.schedules || [],
          availability: host.user.availability || [],
          selectedCalendars: host.user.selectedCalendars || [],
          locale: host.user.locale || null,
          theme: host.user.theme || null,
          brandColor: host.user.brandColor || null,
          darkBrandColor: host.user.darkBrandColor || null,
          hideBranding: host.user.hideBranding || false,
          plan: host.user.plan || null,
          avatarUrl: host.user.avatarUrl || null,
          away: host.user.away || false,
          credentials: host.user.credentials || [],
          destinationCalendar: host.user.destinationCalendar || null,
          travelSchedules: host.user.travelSchedules || [],
          bookings: [],
          completedOnboarding: true,
          weekStart: "Monday",
          organizationId: null,
          allowDynamicBooking: true,
          verified: true,
          role: "USER",
          disableImpersonation: false,
          identityProvider: "CAL",
          trialEndsAt: null,
          createdDate: new Date(),
          movedToProfileId: null,
          invitedTo: null,
          metadata: {},
          bio: null,
          phoneNumber: null,
          appTheme: null,
          isPlatformManaged: false,
          allowSEOIndexing: true,
          receiveMonthlyDigestEmail: true,
          defaultBookerLayouts: {},
          brandColors: {},
          verifiedNumbers: [],
          secondaryEmailId: null,
          secondaryEmail: null,
          isFixed: host.isFixed || false,
          priority: host.priority || null,
          weight: host.weight || null,
          createdAt: host.createdAt || null,
        };

        const transformedUser = withSelectedCalendars(user);

        return {
          isFixed: host.isFixed || false,
          user: transformedUser,
        };
      });

      return {
        ...eventType,
        hosts: hostsWithSelectedCalendars(restructuredHosts),
        users: usersWithSelectedCalendars(eventType.users),
        metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
        rrSegmentQueryValue: rrSegmentQueryValueSchema.parse(eventType.rrSegmentQueryValue),
      };
    } catch (error) {
      log.error("Error in findForSlots raw SQL query", { error, id });
      throw error;
    }
  }

  static getSelectedCalendarsFromUser<TSelectedCalendar extends { eventTypeId: number | null }>({
    user,
    eventTypeId,
  }: {
    user: UserWithSelectedCalendars<TSelectedCalendar>;
    eventTypeId: number;
  }) {
    return user.allSelectedCalendars.filter((calendar) => calendar.eventTypeId === eventTypeId);
  }
}
