import { LookupTarget, ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import type { UserWithLegacySelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { eventTypeSelect } from "@calcom/lib/server/eventTypeSelect";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaClient } from "@calcom/prisma";
import { prisma, availabilityUserSelect } from "@calcom/prisma";
import type { EventType as PrismaEventType } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { EventTypeMetaDataSchema, rrSegmentQueryValueSchema } from "@calcom/prisma/zod-utils";
import type { Ensure } from "@calcom/types/utils";

import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["repository/eventType"] });

const hashedLinkSelect = {
  select: {
    id: true,
    link: true,
    expiresAt: true,
    maxUsageCount: true,
    usageCount: true,
  },
};

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

const userSelect = {
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
  timeZone: true,
} satisfies Prisma.UserSelect;

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
  constructor(private prismaClient: PrismaClient) {}

  private generateCreateEventTypeData = (eventTypeCreateData: IEventType) => {
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

  async create(data: IEventType) {
    return await this.prismaClient.eventType.create({
      data: this.generateCreateEventTypeData(data),
      include: {
        calVideoSettings: true,
      },
    });
  }

  async createMany(data: IEventType[]) {
    return await this.prismaClient.eventType.createMany({
      data: data.map((d) => this.generateCreateEventTypeData(d)),
    });
  }

  async findAllByUpId(
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
      hashedLink: hashedLinkSelect,
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
      team: {
        select: {
          id: true,
          members: {
            select: {
              user: {
                select: {
                  timeZone: true,
                },
              },
            },
            take: 1,
          },
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
      return await this.prismaClient.eventType.findMany({
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
      return await this.prismaClient.eventType.findMany({
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
      return await this.prismaClient.eventType.findMany({
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

  async findAllByUpIdWithMinimalData(
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
      hashedLink: hashedLinkSelect,
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
      return await this.prismaClient.eventType.findMany({
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
      return await this.prismaClient.eventType.findMany({
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
      return await this.prismaClient.eventType.findMany({
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

  async findTeamEventTypes({
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
    const userSelect = {
      name: true,
      avatarUrl: true,
      username: true,
      id: true,
      timeZone: true,
    } satisfies Prisma.UserSelect;

    const select = {
      ...eventTypeSelect,
      hashedLink: hashedLinkSelect,
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
      team: {
        select: {
          id: true,
          members: {
            select: {
              user: {
                select: {
                  timeZone: true,
                },
              },
            },
            take: 1,
          },
        },
      },
    };

    const teamMembership = await this.prismaClient.membership.findFirst({
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

  async findAllByUserId({ userId }: { userId: number }) {
    return await this.prismaClient.eventType.findMany({
      where: {
        userId,
      },
    });
  }

  async findTitleById({ id }: { id: number }) {
    return await this.prismaClient.eventType.findUnique({
      where: {
        id,
      },
      select: {
        title: true,
      },
    });
  }

  async findByIdWithUserAccess({ id, userId }: { id: number; userId: number }) {
    return await this.prismaClient.eventType.findUnique({
      where: {
        id,
        OR: [{ userId }, { hosts: { some: { userId } } }, { users: { some: { id: userId } } }],
      },
    });
  }

  async findById({ id, userId }: { id: number; userId: number }) {
    const userSelect = {
      name: true,
      avatarUrl: true,
      username: true,
      id: true,
      email: true,
      locale: true,
      defaultScheduleId: true,
      isPlatformManaged: true,
      timeZone: true,
    } satisfies Prisma.UserSelect;

    const CompleteEventTypeSelect = {
      id: true,
      title: true,
      slug: true,
      description: true,
      interfaceLanguage: true,
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
      lockedTimeZone: true,
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
      allowReschedulingCancelledBookings: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      slotInterval: true,
      hashedLink: hashedLinkSelect,
      eventTypeColor: true,
      bookingLimits: true,
      onlyShowFirstAvailableSlot: true,
      showOptimizedSlots: true,
      durationLimits: true,
      maxActiveBookingsPerBooker: true,
      maxActiveBookingPerBookerOfferReschedule: true,
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
          timeZone: true,
        },
      },
      parent: {
        select: {
          id: true,
          teamId: true,
        },
      },
      teamId: true,
      hostGroups: {
        select: {
          id: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          rrTimestampBasis: true,
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
      restrictionScheduleId: true,
      useBookerTimezone: true,
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
      restrictionSchedule: {
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
          groupId: true,
          user: {
            select: {
              timeZone: true,
            },
          },
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
      calVideoSettings: {
        select: {
          disableRecordingForGuests: true,
          disableRecordingForOrganizer: true,
          enableAutomaticTranscription: true,
          enableAutomaticRecordingForOrganizer: true,
          disableTranscriptionForGuests: true,
          disableTranscriptionForOrganizer: true,
          redirectUrlOnExit: true,
        },
      },
    } satisfies Prisma.EventTypeSelect;

    // This is more efficient than using a complex join with team.members in the query
    const userTeamIds = await MembershipRepository.findUserTeamIds({ userId });

    return await this.prismaClient.eventType.findFirst({
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

  async findByIdForOrgAdmin({ id, organizationId }: { id: number; organizationId: number }) {
    const userSelect = {
      name: true,
      avatarUrl: true,
      username: true,
      id: true,
      email: true,
      locale: true,
      defaultScheduleId: true,
      isPlatformManaged: true,
      timeZone: true,
    } satisfies Prisma.UserSelect;

    const CompleteEventTypeSelect = {
      id: true,
      title: true,
      slug: true,
      description: true,
      interfaceLanguage: true,
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
      lockedTimeZone: true,
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
      allowReschedulingCancelledBookings: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      slotInterval: true,
      hashedLink: hashedLinkSelect,
      eventTypeColor: true,
      bookingLimits: true,
      onlyShowFirstAvailableSlot: true,
      showOptimizedSlots: true,
      durationLimits: true,
      maxActiveBookingsPerBooker: true,
      maxActiveBookingPerBookerOfferReschedule: true,
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
          timeZone: true,
        },
      },
      parent: {
        select: {
          id: true,
          teamId: true,
        },
      },
      teamId: true,
      hostGroups: {
        select: {
          id: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          rrTimestampBasis: true,
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
      restrictionScheduleId: true,
      useBookerTimezone: true,
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
      restrictionSchedule: {
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
          user: {
            select: {
              timeZone: true,
            },
          },
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
      calVideoSettings: {
        select: {
          disableRecordingForGuests: true,
          disableRecordingForOrganizer: true,
          enableAutomaticTranscription: true,
          enableAutomaticRecordingForOrganizer: true,
          disableTranscriptionForGuests: true,
          disableTranscriptionForOrganizer: true,
          redirectUrlOnExit: true,
        },
      },
    } satisfies Prisma.EventTypeSelect;

    const orgUserEventTypeQuery = {
      AND: [{ userId: { not: null } }, { owner: { profiles: { some: { organizationId } } } }],
    };
    const orgTeamEventTypeQuery = {
      AND: [{ teamId: { not: null } }, { team: { parentId: organizationId } }],
    };

    return await this.prismaClient.eventType.findFirst({
      where: {
        AND: [
          { id },
          {
            OR: [orgUserEventTypeQuery, orgTeamEventTypeQuery],
          },
        ],
      },
      select: CompleteEventTypeSelect,
    });
  }

  async findByIdMinimal({ id }: { id: number }) {
    return await this.prismaClient.eventType.findUnique({
      where: {
        id,
      },
    });
  }

  async findFirstEventTypeId({ slug, teamId, userId }: { slug: string; teamId?: number; userId?: number }) {
    return this.prismaClient.eventType.findFirst({
      where: {
        slug,
        ...(teamId ? { teamId } : {}),
        ...(userId ? { userId } : {}),
      },
      select: {
        id: true,
      },
    });
  }

  async findByIdIncludeHostsAndTeam({ id }: { id: number }) {
    const eventType = await this.prismaClient.eventType.findUnique({
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
            rrTimestampBasis: true,
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

  async findAllByTeamIdIncludeManagedEventTypes({ teamId }: { teamId?: number }) {
    return await this.prismaClient.eventType.findMany({
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

  async findForSlots({ id }: { id: number }) {
    const eventType = await this.prismaClient.eventType.findUnique({
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
        showOptimizedSlots: true,
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
        restrictionScheduleId: true,
        useBookerTimezone: true,
        hostGroups: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            bookingLimits: true,
            includeManagedEventsInLimits: true,
            parentId: true,
            rrResetInterval: true,
            rrTimestampBasis: true,
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
            groupId: true,
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

    if (!eventType) {
      return eventType;
    }

    return {
      ...eventType,
      hosts: hostsWithSelectedCalendars(eventType.hosts),
      users: usersWithSelectedCalendars(eventType.users),
      metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
      rrSegmentQueryValue: rrSegmentQueryValueSchema.parse(eventType.rrSegmentQueryValue),
    };
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

  async findByIdForUserAvailability({ id }: { id: number }) {
    const eventType = await this.prismaClient.eventType.findUnique({
      where: { id },
      select: {
        id: true,
        seatsPerTimeSlot: true,
        bookingLimits: true,
        useEventLevelSelectedCalendars: true,
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
        team: {
          select: {
            id: true,
            bookingLimits: true,
            includeManagedEventsInLimits: true,
          },
        },
        hosts: {
          select: {
            user: {
              select: {
                email: true,
                id: true,
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
        durationLimits: true,
        assignAllTeamMembers: true,
        schedulingType: true,
        timeZone: true,
        length: true,
        metadata: true,
        schedule: {
          select: {
            id: true,
            availability: {
              select: {
                days: true,
                date: true,
                startTime: true,
                endTime: true,
              },
            },
            timeZone: true,
          },
        },
        availability: {
          select: {
            startTime: true,
            endTime: true,
            days: true,
            date: true,
          },
        },
      },
    });
    if (!eventType) {
      return eventType;
    }
    return {
      ...eventType,
      metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
    };
  }

  async getFirstEventTypeByUserId({ userId }: { userId: number }) {
    return await this.prismaClient.eventType.findFirst({
      where: {
        userId,
        teamId: null,
      },
      select: {
        id: true,
      },
    });
  }

  async findEventTypesWithoutChildren(eventTypeIds: number[], teamId?: number | null) {
    return await this.prismaClient.eventType.findMany({
      where: {
        id: {
          in: eventTypeIds,
        },
        ...(teamId && { parentId: null }),
      },
      select: {
        id: true,
        children: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async findAllIncludingChildrenByUserId({ userId }: { userId: number | null }) {
    if (userId === null) {
      return [];
    }
    return await this.prismaClient.eventType.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        children: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async findAllIncludingChildrenByTeamId({ teamId }: { teamId: number }) {
    return await this.prismaClient.eventType.findMany({
      where: {
        teamId,
      },
      select: {
        id: true,
        children: {
          select: {
            id: true,
          },
        },
      },
    });
  }
  async getTeamIdByEventTypeId({ id }: { id: number }) {
    return await this.prismaClient.eventType.findFirst({
      where: {
        id,
      },
      select: {
        teamId: true,
      },
    });
  }
}
