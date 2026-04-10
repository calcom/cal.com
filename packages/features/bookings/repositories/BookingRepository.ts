import { v7 as uuidv7 } from "uuid";

import { withReporting } from "@calcom/lib/sentryWrapper";
import type { PrismaClient } from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, RRTimestampBasis } from "@calcom/prisma/enums";
import { bookingDetailsSelect, bookingMinimalSelect } from "@calcom/prisma/selects/booking";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { workflowSelect } from "../../ee/workflows/lib/getAllWorkflows";
import { UPCOMING_BOOKING_STATUSES } from "../lib/isUpcomingBooking";
import type {
  BookingUpdateData,
  BookingWhereInput,
  BookingWhereUniqueInput,
  IBookingRepository,
} from "./IBookingRepository";

const workflowReminderSelect = {
  id: true,
  referenceId: true,
  method: true,
};

const referenceSelect = {
  uid: true,
  type: true,
  externalCalendarId: true,
  credentialId: true,
};

type ManagedEventReassignmentCreateParams = {
  uid: string;
  userId: number;
  userPrimaryEmail: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  location: string | null;
  smsReminderNumber: string | null;
  responses?: Prisma.JsonValue | null;
  customInputs?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey: string;
  eventTypeId: number;
  attendees: {
    name: string;
    email: string;
    timeZone: string;
    locale: string | null;
    phoneNumber?: string | null;
  }[];
  paymentId?: number;
  iCalUID: string;
  iCalSequence: number;
  tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
};

export type ManagedEventReassignmentCreatedBooking = {
  id: number;
  uid: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  metadata: Prisma.JsonValue;
  responses: Prisma.JsonValue;
  iCalUID: string | null;
  iCalSequence: number;
  smsReminderNumber: string | null;
  attendees: {
    name: string;
    email: string;
    timeZone: string;
    locale: string | null;
  }[];
};

export type ManagedEventCancellationResult = {
  id: number;
  uid: string;
  metadata: Prisma.JsonValue;
  status: BookingStatus;
};

export type FormResponse = Record<
  // Field ID
  string,
  {
    value: number | string | string[];
    label: string;
    identifier?: string;
  }
>;

type TeamBookingsParamsBase = {
  user: { id: number; email: string };
  teamId: number;
  startDate: Date;
  endDate: Date;
  excludedUid?: string | null;
  includeManagedEvents: boolean;
  shouldReturnCount?: boolean;
};

type TeamBookingsMultipleUsersParamsBase = {
  users: { id: number; email: string }[];
  teamId: number;
  startDate: Date;
  endDate: Date;
  excludedUid?: string | null;
  includeManagedEvents: boolean;
  shouldReturnCount?: boolean;
};

type TeamBookingsMultipleUsersParamsWithCount = TeamBookingsMultipleUsersParamsBase & {
  shouldReturnCount: true;
};

type TeamBookingsMultipleUsersParamsWithoutCount = TeamBookingsMultipleUsersParamsBase & {
  shouldReturnCount?: false;
};

type TeamBookingsParamsWithCount = TeamBookingsParamsBase & {
  shouldReturnCount: true;
};

type TeamBookingsParamsWithoutCount = TeamBookingsParamsBase & {
  shouldReturnCount?: false;
};

export type TeamBookingSelectFields = {
  id: number;
  startTime: Date;
  endTime: Date;
  eventTypeId: number | null;
  title: string;
  userId: number | null;
};

const teamBookingSelect = {
  id: true,
  startTime: true,
  endTime: true,
  eventTypeId: true,
  title: true,
  userId: true,
} as const satisfies Record<keyof TeamBookingSelectFields, true>;

type ActiveBookingsParams = {
  eventTypeId: number;
  startDate?: Date;
  endDate?: Date;
  users: { id: number; email: string }[];
  virtualQueuesData: {
    chosenRouteId: string;
    fieldOptionData: {
      fieldId: string;
      selectedOptionIds: string | number | string[];
    };
  } | null;
  includeNoShowInRRCalculation: boolean;
  rrTimestampBasis: RRTimestampBasis;
};

/**
 * Builds a raw SQL UNION query to efficiently fetch booking IDs for round-robin calculations.
 * Uses UNION (not UNION ALL) for automatic deduplication at the DB level.
 *
 * Branch 1: Bookings where one of the users is the organizer (userId)
 * Branch 2: Bookings where one of the users is an attendee (email)
 */
const buildRoundRobinBookingIdsQuery = ({
  users,
  eventTypeId,
  startDate,
  endDate,
  rrTimestampBasis,
  virtualQueuesData,
}: Omit<ActiveBookingsParams, "includeNoShowInRRCalculation">): Prisma.Sql => {
  const userIds = users.map((u) => u.id);
  const userEmails = users.map((u) => u.email);

  // Date filter conditions
  const dateConditions: Prisma.Sql[] = [];
  if (startDate || endDate) {
    const dateColumn =
      rrTimestampBasis === RRTimestampBasis.CREATED_AT
        ? Prisma.sql`b."createdAt"`
        : Prisma.sql`b."startTime"`;
    if (startDate) dateConditions.push(Prisma.sql`AND ${dateColumn} >= ${startDate}`);
    if (endDate) dateConditions.push(Prisma.sql`AND ${dateColumn} <= ${endDate}`);
  }
  const dateSql = dateConditions.length > 0 ? Prisma.join(dateConditions, " ") : Prisma.sql``;

  // Virtual queues: JOIN + WHERE on chosenRouteId
  const virtualQueuesJoin = virtualQueuesData
    ? Prisma.sql`INNER JOIN "App_RoutingForms_FormResponse" r ON r."routedToBookingUid" = b."uid"`
    : Prisma.sql``;
  const virtualQueuesCondition = virtualQueuesData
    ? Prisma.sql`AND r."chosenRouteId" = ${virtualQueuesData.chosenRouteId}`
    : Prisma.sql``;

  // NoShow filtering is done in application code (Step 3 in getAllBookingsForRoundRobin)
  // rather than via EXISTS subqueries here. The EXISTS caused O(n) semi-join probes
  // against the Attendee table — one per candidate booking row — which dominated query
  // time on high-volume event types (e.g. 15k probes × cold-cache heap lookups = 7s).
  // Since nearly all attendees have noShow=false, the filter eliminates <0.1% of rows
  // but costs >90% of execution time. Moving it to JS is effectively free.

  return Prisma.sql`
    SELECT b."id" FROM "Booking" b
    ${virtualQueuesJoin}
    WHERE b."status" = 'accepted'::"BookingStatus"
    AND b."eventTypeId" = ${eventTypeId}
    AND b."userId" IN (${Prisma.join(userIds)})
    ${dateSql}
    ${virtualQueuesCondition}

    UNION

    SELECT b."id" FROM "Booking" b
    INNER JOIN "Attendee" a ON a."bookingId" = b."id" AND a."email" IN (${Prisma.join(userEmails)})
    ${virtualQueuesJoin}
    WHERE b."status" = 'accepted'::"BookingStatus"
    AND b."eventTypeId" = ${eventTypeId}
    ${dateSql}
    ${virtualQueuesCondition}
  `;
};

const destinationCalendarSelect: Prisma.DestinationCalendarSelect = {
  id: true,
  integration: true,
  externalId: true,
  primaryEmail: true,
  userId: true,
  credentialId: true,
};

/**
 * Scoped select for findByUid / findLatestBookingInRescheduleChain.
 * Only the 14 fields consumed by CalendarSyncService (BookingFromSync).
 */
const bookingSyncSelect = {
  uid: true,
  status: true,
  userId: true,
  userPrimaryEmail: true,
  recurringEventId: true,
  rescheduled: true,
  startTime: true,
  endTime: true,
  eventTypeId: true,
  title: true,
  description: true,
  location: true,
  responses: true,
  smsReminderNumber: true,
} as const;

const selectStatementToGetBookingForCalEventBuilder = {
  id: true,
  uid: true,
  title: true,
  startTime: true,
  endTime: true,
  description: true,
  customInputs: true,
  responses: true,
  metadata: true,
  location: true,
  iCalUID: true,
  iCalSequence: true,
  oneTimePassword: true,
  status: true,
  eventTypeId: true,
  userId: true,
  userPrimaryEmail: true,
  smsReminderNumber: true,
  cancellationReason: true,
  cancelledBy: true,
  rejectionReason: true,
  rescheduledBy: true,
  fromReschedule: true,
  attendees: {
    select: {
      id: true,
      name: true,
      email: true,
      timeZone: true,
      locale: true,
      phoneNumber: true,
      bookingSeat: {
        select: {
          id: true,
          referenceUid: true,
          bookingId: true,
          attendeeId: true,
          data: true,
          metadata: true,
        },
      },
    },
  },
  user: {
    // Organizer
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      timeZone: true,
      locale: true,
      timeFormat: true,
      hideBranding: true,
      destinationCalendar: { select: destinationCalendarSelect },
      profiles: {
        select: {
          organizationId: true,
          organization: { select: { hideBranding: true } },
        },
      },
    },
  },
  // destination calendar of the Organizer
  destinationCalendar: { select: destinationCalendarSelect },
  eventType: {
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      hideCalendarNotes: true,
      price: true,
      currency: true,
      length: true,
      hideCalendarEventDetails: true,
      hideOrganizerEmail: true,
      schedulingType: true,
      seatsPerTimeSlot: true,
      seatsShowAttendees: true,
      seatsShowAvailabilityCount: true,
      customReplyToEmail: true,
      disableRescheduling: true,
      disableReschedulingScope: true,
      disableCancelling: true,
      disableCancellingScope: true,
      disableReassignment: true,
      requiresConfirmation: true,
      recurringEvent: true,
      bookingFields: true,
      metadata: true,
      eventName: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          parentId: true,
          hideBranding: true,
          parent: { select: { hideBranding: true } },
          members: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  timeZone: true,
                  locale: true,
                  timeFormat: true,
                },
              },
            },
          },
        },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          timeZone: true,
          locale: true,
          timeFormat: true,
          destinationCalendar: { select: destinationCalendarSelect },
        },
      },
      hosts: {
        select: {
          userId: true,
          isFixed: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              timeZone: true,
              locale: true,
              timeFormat: true,
              destinationCalendar: { select: destinationCalendarSelect },
            },
          },
        },
      },
    },
  },
  references: {
    where: {
      deleted: null,
    },
    select: {
      type: true,
      meetingId: true,
      meetingPassword: true,
      meetingUrl: true,
      uid: true,
    },
  },
  seatsReferences: {
    select: {
      id: true,
      referenceUid: true,
      attendee: { select: { id: true, email: true, phoneNumber: true } },
    },
  },
  assignmentReason: {
    select: {
      reasonEnum: true,
      reasonString: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
  },
};

export class BookingRepository implements IBookingRepository {
  constructor(private prismaClient: PrismaClient) {}

  /**
   * Gets the fromReschedule field for a booking by UID
   * Used to identify if this booking was created from a reschedule
   * @param bookingUid - The unique identifier of the booking
   * @returns The fromReschedule UID or null if not found/not a rescheduled booking
   */
  async getFromRescheduleUid(bookingUid: string): Promise<string | null> {
    const booking = await this.prismaClient.booking.findUnique({
      where: { uid: bookingUid },
      select: { fromReschedule: true },
    });
    return booking?.fromReschedule ?? null;
  }

  async getBookingAttendees(bookingId: number) {
    return await this.prismaClient.attendee.findMany({
      where: {
        bookingId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        timeZone: true,
        locale: true,
        phoneNumber: true,
        noShow: true,
      },
    });
  }

  async getBookingWithEventTypeTeamId({ bookingId }: { bookingId: number }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        userId: true,
        eventType: {
          select: {
            teamId: true,
          },
        },
      },
    });
  }

  async findAttendeeNoShowByIds({
    ids,
  }: {
    ids: number[];
  }): Promise<{ id: number; email: string; noShow: boolean }[]> {
    const rows = await this.prismaClient.attendee.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, noShow: true },
    });
    return rows.map((r) => ({ id: r.id, email: r.email, noShow: r.noShow ?? false }));
  }

  async findByUidIncludeEventTypeAttendeesAndUser({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        title: true,
        metadata: true,
        uid: true,
        location: true,
        destinationCalendar: { select: destinationCalendarSelect },
        smsReminderNumber: true,
        userPrimaryEmail: true,
        eventType: {
          select: {
            id: true,
            hideOrganizerEmail: true,
            customReplyToEmail: true,
            schedulingType: true,
            slug: true,
            title: true,
            metadata: true,
            parentId: true,
            teamId: true,
            userId: true,
            hosts: {
              select: {
                user: {
                  select: {
                    email: true,
                    destinationCalendar: {
                      select: {
                        primaryEmail: true,
                      },
                    },
                  },
                },
              },
            },
            parent: {
              select: {
                teamId: true,
              },
            },
            workflows: {
              select: {
                workflow: {
                  select: workflowSelect,
                },
              },
            },
            owner: {
              select: {
                id: true,
                hideBranding: true,
                email: true,
                name: true,
                timeZone: true,
                locale: true,
                profiles: {
                  select: {
                    organization: { select: { hideBranding: true } },
                  },
                },
              },
            },
            team: {
              select: {
                parentId: true,
                name: true,
                id: true,
                hideBranding: true,
                parent: { select: { hideBranding: true } },
              },
            },
          },
        },
        attendees: {
          select: {
            id: true,
            email: true,
            name: true,
            timeZone: true,
            locale: true,
            phoneNumber: true,
            noShow: true,
          },
        },
        user: {
          select: {
            id: true,
            uuid: true,
            email: true,
            name: true,
            destinationCalendar: { select: destinationCalendarSelect },
            timeZone: true,
            locale: true,
            username: true,
            timeFormat: true,
          },
        },
        noShowHost: true,
      },
    });
  }

  async findByUidIncludeEventType({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        attendees: {
          select: {
            email: true,
          },
        },
        eventType: {
          select: {
            teamId: true,
            team: {
              select: {
                parentId: true,
              },
            },
            parent: {
              select: {
                teamId: true,
                team: {
                  select: {
                    parentId: true,
                  },
                },
              },
            },
            hosts: {
              select: {
                userId: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
            users: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findByIdIncludeEventType({ bookingId }: { bookingId: number }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        attendees: {
          select: {
            email: true,
          },
        },
        eventType: {
          select: {
            teamId: true,
            team: {
              select: {
                parentId: true,
              },
            },
            parent: {
              select: {
                teamId: true,
                team: {
                  select: {
                    parentId: true,
                  },
                },
              },
            },
            hosts: {
              select: {
                userId: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
            users: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findFirstBookingByReschedule({ originalBookingUid }: { originalBookingUid: string }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        fromReschedule: originalBookingUid,
      },
      select: {
        uid: true,
      },
    });
  }

  async findReschedulerByUid({ uid }: { uid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid,
      },
      select: {
        rescheduledBy: true,
        uid: true,
      },
    });
  }

  async findByUidIncludeReport({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        id: true,
        uid: true,
        userId: true,
        startTime: true,
        status: true,
        recurringEventId: true,
        attendees: {
          select: {
            email: true,
          },
        },
        seatsReferences: {
          select: {
            referenceUid: true,
            attendee: {
              select: {
                email: true,
              },
            },
          },
        },
        report: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async findByUidForDetails({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: bookingDetailsSelect,
    });
  }

  async findByUidSelectBasicStatus({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: { uid: bookingUid },
      select: { uid: true, status: true, endTime: true, recurringEventId: true },
    });
  }

  async findRescheduledToBooking({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        fromReschedule: bookingUid,
      },
      select: {
        uid: true,
      },
    });
  }

  async findPreviousBooking({ fromReschedule }: { fromReschedule: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: fromReschedule,
      },
      select: {
        id: true,
        uid: true,
        startTime: true,
        endTime: true,
        rescheduledBy: true,
      },
    });
  }

  async getActiveRecurringBookingsFromDate({
    recurringEventId,
    fromDate,
  }: {
    recurringEventId: string;
    fromDate: Date;
  }) {
    return await this.prismaClient.booking.findMany({
      where: {
        recurringEventId,
        startTime: { gte: fromDate },
        status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
      },
      select: { id: true, uid: true },
      orderBy: { startTime: "asc" },
    });
  }

  async findUpcomingByAttendeeEmail({
    attendeeEmail,
    hostUserId,
  }: {
    attendeeEmail: string;
    hostUserId: number;
  }) {
    return await this.prismaClient.booking.findMany({
      where: {
        userId: hostUserId,
        startTime: { gt: new Date() },
        status: { in: UPCOMING_BOOKING_STATUSES },
        attendees: {
          some: {
            email: { equals: attendeeEmail },
          },
        },
      },
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        attendees: { select: { email: true } },
        report: { select: { id: true } },
      },
      orderBy: { startTime: "asc" },
    });
  }

  async findUpcomingByAttendeeDomain({ domain, hostUserId }: { domain: string; hostUserId: number }) {
    return await this.prismaClient.booking.findMany({
      where: {
        userId: hostUserId,
        startTime: { gt: new Date() },
        status: { in: UPCOMING_BOOKING_STATUSES },
        attendees: {
          some: {
            email: { endsWith: `@${domain}` },
          },
        },
      },
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        attendees: { select: { email: true } },
        report: { select: { id: true } },
      },
      orderBy: { startTime: "asc" },
    });
  }

  async findUpcomingUnreportedOrgBookingsByEmail({
    email,
    organizationId,
  }: {
    email: string;
    organizationId: number;
  }) {
    return this.findUpcomingUnreportedOrgBookings({
      attendeeEmailCondition: Prisma.sql`a."email" = ${email}`,
      organizationId,
    });
  }

  async findUpcomingUnreportedOrgBookingsByDomain({
    domain,
    organizationId,
  }: {
    domain: string;
    organizationId: number;
  }) {
    const pattern = `%@${domain}`;
    return this.findUpcomingUnreportedOrgBookings({
      attendeeEmailCondition: Prisma.sql`a."email" LIKE ${pattern}`,
      organizationId,
    });
  }

  private async findUpcomingUnreportedOrgBookings({
    attendeeEmailCondition,
    organizationId,
  }: {
    attendeeEmailCondition: Prisma.Sql;
    organizationId: number;
  }) {
    const rows = await this.prismaClient.$queryRaw<
      {
        id: number;
        uid: string;
        title: string;
        startTime: Date;
        endTime: Date;
        status: string;
        attendeeEmail: string;
      }[]
    >(Prisma.sql`
      SELECT
        b."id",
        b."uid",
        b."title",
        b."startTime",
        b."endTime",
        b."status",
        a."email" AS "attendeeEmail"
      FROM "Booking" b
      INNER JOIN "Attendee" a ON a."bookingId" = b."id"
      WHERE b."startTime" > NOW()
        AND b."status" IN ('accepted'::"BookingStatus", 'pending'::"BookingStatus", 'awaiting_host'::"BookingStatus")
        AND NOT EXISTS (
          SELECT 1 FROM "BookingReport" br WHERE br."bookingUid" = b."uid"
        )
        AND ${attendeeEmailCondition}
        AND (
          EXISTS (
            SELECT 1 FROM "EventType" et
            INNER JOIN "Team" t ON t."id" = et."teamId"
            WHERE et."id" = b."eventTypeId"
              AND (t."id" = ${organizationId} OR t."parentId" = ${organizationId})
          )
          OR EXISTS (
            SELECT 1 FROM "Profile" p
            WHERE p."userId" = b."userId"
              AND p."organizationId" = ${organizationId}
          )
        )
      ORDER BY b."startTime" ASC
    `);

    return rows.map((row) => ({
      id: row.id,
      uid: row.uid,
      title: row.title,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status,
      report: null,
      attendees: [{ email: row.attendeeEmail }],
    }));
  }

  async findByUidIncludeReportAndEventType({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        id: true,
        uid: true,
        userId: true,
        startTime: true,
        status: true,
        recurringEventId: true,
        attendees: {
          select: {
            email: true,
          },
        },
        seatsReferences: {
          select: {
            referenceUid: true,
            attendee: {
              select: {
                email: true,
              },
            },
          },
        },
        report: {
          select: {
            id: true,
          },
        },
        eventType: {
          select: {
            teamId: true,
            team: {
              select: {
                id: true,
                parentId: true,
              },
            },
          },
        },
        user: {
          select: {
            profiles: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });
  }

  async findByRecurringEventIdAndStartTime({
    recurringEventId,
    startTime,
  }: {
    recurringEventId: string;
    startTime: Date;
  }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        recurringEventId,
        startTime,
        status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
      },
      select: { id: true, uid: true },
    });
  }
  private async _findAllExistingBookingsForEventTypeBetween({
    eventTypeId,
    seatedEvent = false,
    startDate,
    endDate,
    userIdAndEmailMap,
  }: {
    startDate: Date;
    endDate: Date;
    eventTypeId?: number | null;
    seatedEvent?: boolean;
    userIdAndEmailMap: Map<number, string>;
  }) {
    const sharedQuery = {
      startTime: { lte: endDate },
      endTime: { gte: startDate },
      status: {
        in: [BookingStatus.ACCEPTED],
      },
    };

    const bookingsSelect = {
      id: true,
      uid: true,
      userId: true,
      startTime: true,
      endTime: true,
      title: true,
      attendees: {
        select: {
          email: true,
        },
      },
      eventType: {
        select: {
          id: true,
          onlyShowFirstAvailableSlot: true,
          afterEventBuffer: true,
          beforeEventBuffer: true,
          seatsPerTimeSlot: true,
          requiresConfirmationWillBlockSlot: true,
          requiresConfirmation: true,
          allowReschedulingPastBookings: true,
          hideOrganizerEmail: true,
        },
      },
      ...(seatedEvent && {
        _count: {
          select: {
            seatsReferences: true,
          },
        },
      }),
    } satisfies Prisma.BookingSelect;

    const currentBookingsAllUsersQueryOne = this.prismaClient.booking.findMany({
      where: {
        ...sharedQuery,
        userId: {
          in: Array.from(userIdAndEmailMap.keys()),
        },
      },
      select: bookingsSelect,
    });

    const currentBookingsAllUsersQueryTwo = this.prismaClient.booking.findMany({
      where: {
        ...sharedQuery,
        attendees: {
          some: {
            email: {
              in: Array.from(userIdAndEmailMap.values()),
            },
          },
        },
      },
      select: bookingsSelect,
    });

    const currentBookingsAllUsersQueryThree = eventTypeId
      ? this.prismaClient.booking.findMany({
          where: {
            startTime: { lte: endDate },
            endTime: { gte: startDate },
            eventType: {
              id: eventTypeId,
              requiresConfirmation: true,
              requiresConfirmationWillBlockSlot: true,
            },
            status: {
              in: [BookingStatus.PENDING],
            },
          },
          select: bookingsSelect,
        })
      : [];

    const [resultOne, resultTwo, resultThree] = await Promise.all([
      currentBookingsAllUsersQueryOne,
      currentBookingsAllUsersQueryTwo,
      currentBookingsAllUsersQueryThree,
    ]);
    // Prevent duplicate booking records when the organizer books his own event type.
    //
    // *Three is about PENDING, so will never overlap
    // with the other two, which are about ACCEPTED. But ACCEPTED affects *One & *Two
    // and WILL result in a duplicate booking if the organizer books himself.
    const resultTwoWithOrganizersRemoved = resultTwo.filter((booking) => {
      if (!booking.userId) return true;
      const organizerEmail = userIdAndEmailMap.get(booking.userId);
      return !booking.attendees.some((attendee) => attendee.email === organizerEmail);
    });

    return [...resultOne, ...resultTwoWithOrganizersRemoved, ...resultThree];
  }

  findAllExistingBookingsForEventTypeBetween = withReporting(
    this._findAllExistingBookingsForEventTypeBetween.bind(this),
    "findAllExistingBookingsForEventTypeBetween"
  );

  async getAllBookingsForRoundRobin({
    users,
    eventTypeId,
    startDate,
    endDate,
    virtualQueuesData,
    includeNoShowInRRCalculation,
    rrTimestampBasis,
  }: {
    users: { id: number; email: string }[];
    eventTypeId: number;
    startDate?: Date;
    endDate?: Date;
    virtualQueuesData: {
      chosenRouteId: string;
      fieldOptionData: {
        fieldId: string;
        selectedOptionIds: string | number | string[];
      };
    } | null;
    includeNoShowInRRCalculation: boolean;
    rrTimestampBasis: RRTimestampBasis;
  }) {
    // Guard: Prisma.join() requires a non-empty array, and there's nothing to query anyway.
    if (users.length === 0) return [];

    // Step 1: Get matching booking IDs via a single raw SQL UNION query.
    // This is faster than parallel Prisma queries: single DB round-trip,
    // DB-level deduplication (UNION), and each branch gets its own optimized plan.
    const bookingIdsResult = await this.prismaClient.$queryRaw<{ id: number }[]>(
      buildRoundRobinBookingIdsQuery({
        eventTypeId,
        startDate,
        endDate,
        users,
        virtualQueuesData,
        rrTimestampBasis,
      })
    );

    const bookingIds = bookingIdsResult.map((r) => r.id);

    if (bookingIds.length === 0) return [];

    // Step 2: Fetch full records with relations via Prisma (simple id IN (...) query).
    const allBookings = await this.prismaClient.booking.findMany({
      where: { id: { in: bookingIds } },
      select: {
        id: true,
        attendees: {
          select: {
            email: true,
            noShow: true,
          },
        },
        userId: true,
        createdAt: true,
        status: true,
        startTime: true,
        noShowHost: true,
        routedFromRoutingFormReponse: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Step 3: Filter out no-show bookings in application code.
    // This was previously an EXISTS subquery in the raw SQL, but it caused O(n) semi-join
    // probes against the Attendee table per candidate booking, dominating query time on
    // high-volume event types. Filtering here is effectively free since we already have
    // the attendee data from Step 2.
    let queueBookings: typeof allBookings;
    if (!includeNoShowInRRCalculation) {
      queueBookings = allBookings.filter(
        (booking) =>
          booking.attendees.some((a) => a.noShow === false) &&
          (booking.noShowHost === false || booking.noShowHost === null)
      );
    } else {
      queueBookings = allBookings;
    }

    if (virtualQueuesData) {
      queueBookings = allBookings.filter((booking) => {
        const responses = booking.routedFromRoutingFormReponse;
        const fieldId = virtualQueuesData.fieldOptionData.fieldId;
        const selectedOptionIds = virtualQueuesData.fieldOptionData.selectedOptionIds;

        const response = responses?.response as FormResponse;

        const responseValue = response[fieldId].value;

        if (Array.isArray(responseValue) && Array.isArray(selectedOptionIds)) {
          //check if all values are the same (this only support 'all in' not 'any in')
          return (
            responseValue.length === selectedOptionIds.length &&
            responseValue.every((value, index) => value === selectedOptionIds[index])
          );
        } else {
          return responseValue === selectedOptionIds;
        }
      });
    }
    return queueBookings;
  }

  async findBookingByUid({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: bookingMinimalSelect,
    });
  }

  async findFirstBookingFromResponse({ responseId }: { responseId: number }) {
    const booking = await this.prismaClient.booking.findFirst({
      where: {
        routedFromRoutingFormReponse: {
          id: responseId,
        },
      },
      select: {
        id: true,
      },
    });

    return booking;
  }

  async findByUid({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: bookingSyncSelect,
    });
  }

  /**
   * Follows the reschedule chain starting from a booking UID to find the latest
   * non-cancelled booking. Uses a recursive CTE for a single DB round-trip
   * instead of N sequential queries.
   */
  async findLatestBookingInRescheduleChain({ bookingUid }: { bookingUid: string }) {
    const result = await this.prismaClient.$queryRaw<{ uid: string }[]>`
      WITH RECURSIVE chain AS (
        SELECT uid, "fromReschedule", 0 AS depth
        FROM "Booking"
        WHERE uid = ${bookingUid}

        UNION ALL

        SELECT b.uid, b."fromReschedule", c.depth + 1
        FROM "Booking" b
        INNER JOIN chain c ON b."fromReschedule" = c.uid
      )
      SELECT uid FROM chain
      ORDER BY depth DESC
      LIMIT 1
    `;

    const latestUid = result[0]?.uid;
    if (!latestUid || latestUid === bookingUid) return null;

    return await this.prismaClient.booking.findUnique({
      where: { uid: latestUid },
      select: bookingSyncSelect,
    });
  }

  async findByIdIncludeUserAndAttendees(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        ...bookingMinimalSelect,
        eventType: {
          select: {
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        attendees: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
          },
          // Ascending order ensures that the first attendee in the list is the booker and others are guests
          // See why it is important https://github.com/calcom/cal.com/pull/20935
          // TODO: Ideally we should return `booker` property directly from the booking
          orderBy: {
            id: "asc",
          },
        },
      },
    });
  }

  async findBookingIncludeCalVideoSettingsAndReferences({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        ...bookingMinimalSelect,
        uid: true,
        description: true,
        isRecorded: true,
        eventType: {
          select: {
            id: true,
            hideOrganizerEmail: true,
            seatsPerTimeSlot: true,
            hosts: {
              select: {
                userId: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
            users: {
              select: {
                id: true,
                email: true,
              },
            },
            calVideoSettings: {
              select: {
                disableRecordingForGuests: true,
                disableRecordingForOrganizer: true,
                enableAutomaticTranscription: true,
                enableAutomaticRecordingForOrganizer: true,
                disableTranscriptionForGuests: true,
                disableTranscriptionForOrganizer: true,
                redirectUrlOnExit: true,
                requireEmailForGuests: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            timeZone: true,
            name: true,
            email: true,
            username: true,
          },
        },
        references: {
          select: {
            id: true,
            uid: true,
            type: true,
            meetingUrl: true,
            meetingPassword: true,
          },
          where: {
            type: "daily_video",
            deleted: null,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });
  }

  async findBookingForMeetingEndedPage({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        ...bookingMinimalSelect,
        uid: true,
      },
    });
  }

  async updateLocationById({
    where: { id },
    data: { location, metadata, referencesToCreate, responses, iCalSequence },
  }: {
    where: { id: number };
    data: {
      location: string;
      metadata: Record<string, unknown>;
      referencesToCreate: Prisma.BookingReferenceCreateInput[];
      responses?: Record<string, unknown>;
      iCalSequence?: number;
    };
  }) {
    await this.prismaClient.booking.update({
      where: {
        id,
      },
      data: {
        location,
        // FIXME: metadata is untyped
        metadata: metadata as unknown as Prisma.InputJsonValue,
        // FIXME: responses is untyped
        ...(responses && { responses: responses as unknown as Prisma.InputJsonValue }),
        ...(iCalSequence !== undefined && { iCalSequence }),
        references: {
          create: referencesToCreate,
        },
      },
    });
  }

  async getAllAcceptedTeamBookingsOfUser(params: TeamBookingsParamsWithCount): Promise<number>;

  async getAllAcceptedTeamBookingsOfUser(
    params: TeamBookingsParamsWithoutCount
  ): Promise<Array<TeamBookingSelectFields>>;

  async getAllAcceptedTeamBookingsOfUser(params: TeamBookingsParamsBase): Promise<number | Array<TeamBookingSelectFields>> {
    const { user, teamId, startDate, endDate, excludedUid, shouldReturnCount, includeManagedEvents } = params;

    const baseWhere: Prisma.BookingWhereInput = {
      status: BookingStatus.ACCEPTED,
      startTime: {
        gte: startDate,
      },
      endTime: {
        lte: endDate,
      },
      ...(excludedUid && {
        uid: {
          not: excludedUid,
        },
      }),
    };

    const whereCollectiveRoundRobinOwner: Prisma.BookingWhereInput = {
      ...baseWhere,
      userId: user.id,
      eventType: {
        teamId,
      },
    };

    const whereCollectiveRoundRobinBookingsAttendee: Prisma.BookingWhereInput = {
      ...baseWhere,
      attendees: {
        some: {
          email: user.email,
        },
      },
      eventType: {
        teamId,
      },
    };

    const whereManagedBookings: Prisma.BookingWhereInput = {
      ...baseWhere,
      userId: user.id,
      eventType: {
        parent: {
          teamId,
        },
      },
    };

    if (shouldReturnCount) {
      const collectiveRoundRobinBookingsOwner = await this.prismaClient.booking.count({
        where: whereCollectiveRoundRobinOwner,
      });

      const collectiveRoundRobinBookingsAttendee = await this.prismaClient.booking.count({
        where: whereCollectiveRoundRobinBookingsAttendee,
      });

      let managedBookings = 0;

      if (includeManagedEvents) {
        managedBookings = await this.prismaClient.booking.count({
          where: whereManagedBookings,
        });
      }

      const totalNrOfBooking =
        collectiveRoundRobinBookingsOwner + collectiveRoundRobinBookingsAttendee + managedBookings;

      return totalNrOfBooking;
    }

    const collectiveRoundRobinBookingsOwner = await this.prismaClient.booking.findMany({
      where: whereCollectiveRoundRobinOwner,
      select: teamBookingSelect,
    });

    const collectiveRoundRobinBookingsAttendee = await this.prismaClient.booking.findMany({
      where: whereCollectiveRoundRobinBookingsAttendee,
      select: teamBookingSelect,
    });

    let managedBookings: typeof collectiveRoundRobinBookingsAttendee = [];

    if (includeManagedEvents) {
      managedBookings = await this.prismaClient.booking.findMany({
        where: whereManagedBookings,
        select: teamBookingSelect,
      });
    }

    return [
      ...collectiveRoundRobinBookingsOwner,
      ...collectiveRoundRobinBookingsAttendee,
      ...managedBookings,
    ];
  }

  async findOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
    return await this.prismaClient.booking.findFirst({
      where: {
        uid: uid,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED, BookingStatus.PENDING],
        },
      },
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        description: true,
        location: true,
        responses: true,
        metadata: true,
        paid: true,
        recurringEventId: true,
        iCalUID: true,
        iCalSequence: true,
        status: true,
        rescheduled: true,
        userId: true,
        attendees: {
          select: {
            name: true,
            email: true,
            locale: true,
            timeZone: true,
            phoneNumber: true,
            ...(seatsEventType && {
              bookingSeat: {
                select: {
                  id: true,
                  referenceUid: true,
                  data: true,
                },
              },
              id: true,
            }),
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            locale: true,
            timeZone: true,
            timeFormat: true,
            destinationCalendar: { select: destinationCalendarSelect },
            credentials: {
              select: credentialForCalendarServiceSelect,
            },
          },
        },
        eventType: {
          select: {
            id: true,
            minimumRescheduleNotice: true,
            disableRescheduling: true,
            userId: true,
          },
        },
        destinationCalendar: { select: destinationCalendarSelect },
        payment: {
          select: {
            id: true,
            success: true,
          },
        },
        references: {
          select: {
            id: true,
            uid: true,
            type: true,
            meetingId: true,
            meetingUrl: true,
            meetingPassword: true,
            credentialId: true,
            delegationCredentialId: true,
            domainWideDelegationCredentialId: true,
            externalCalendarId: true,
            bookingId: true,
            thirdPartyRecurringEventId: true,
            deleted: true,
          },
        },
        workflowReminders: {
          select: workflowReminderSelect,
        },
      },
    });
  }

  async getAllAcceptedTeamBookingsOfUsers(params: TeamBookingsMultipleUsersParamsWithCount): Promise<number>;

  async getAllAcceptedTeamBookingsOfUsers(
    params: TeamBookingsMultipleUsersParamsWithoutCount
  ): Promise<Array<TeamBookingSelectFields>>;

  async getAllAcceptedTeamBookingsOfUsers(params: TeamBookingsMultipleUsersParamsBase): Promise<number | Array<TeamBookingSelectFields>> {
    const { users, teamId, startDate, endDate, excludedUid, shouldReturnCount, includeManagedEvents } =
      params;

    if (users.length === 0) return shouldReturnCount ? 0 : [];

    const userIds = users.map((u) => u.id);
    const userEmails = users.map((u) => u.email);

    // Run both queries in parallel to avoid sequential network round-trips.
    // Step 1: Team event type IDs (small indexed lookup on EventType(teamId) and EventType(parentId, teamId))
    // Step 2: User bookings via raw SQL UNION ALL (user-first, no EventType join)
    //   Branch 1 uses Booking(userId, status, startTime) index.
    //   Branch 2 uses Attendee(email, bookingId) index.
    //   UNION ALL avoids expensive sort/hash deduplication — duplicates removed in post-filter.
    const teamEventTypesQuery = includeManagedEvents
      ? this.prismaClient.$queryRaw<{ id: number; parentId: number | null }[]>`
          SELECT id, "parentId"
          FROM "EventType"
          WHERE "teamId" = ${teamId}

          UNION ALL

          SELECT et.id, et."parentId"
          FROM "EventType" et
          WHERE et."parentId" IN (
            SELECT id FROM "EventType" WHERE "teamId" = ${teamId}
          )
        `
      : this.prismaClient.eventType.findMany({
          where: { teamId },
          select: { id: true, parentId: true },
        });

    const bookingsQuery = this.prismaClient.$queryRaw<
      { id: number; uid: string; startTime: Date; endTime: Date; eventTypeId: number | null; title: string; userId: number | null }[]
    >`
      SELECT b."id", b."uid", b."startTime", b."endTime", b."eventTypeId", b.title, b."userId"
      FROM "Booking" b
      WHERE b."status" = 'accepted'::"BookingStatus"
        AND b."userId" IN (${Prisma.join(userIds)})
        AND b."startTime" >= ${startDate}
        AND b."endTime" <= ${endDate}

      UNION ALL

      SELECT b."id", b."uid", b."startTime", b."endTime", b."eventTypeId", b.title, b."userId"
      FROM "Booking" b
      INNER JOIN "Attendee" a ON a."bookingId" = b."id"
        AND a."email" IN (${Prisma.join(userEmails)})
      WHERE b."status" = 'accepted'::"BookingStatus"
        AND b."startTime" >= ${startDate}
        AND b."endTime" <= ${endDate}
    `;

    const [eventTypes, rows] = await Promise.all([teamEventTypesQuery, bookingsQuery]);

    // Direct team event types (parentId is null) vs managed event types (parentId is set)
    const directTeamEventTypeIds = new Set<number>();
    const managedEventTypeIds = new Set<number>();
    for (const et of eventTypes) {
      if (et.parentId) {
        managedEventTypeIds.add(et.id);
      } else {
        directTeamEventTypeIds.add(et.id);
      }
    }
    const userIdSet = new Set(userIds);

    // Step 3: Post-filter for team membership, excludedUid, and duplicates.
    // Team membership filter eliminates near-zero rows in practice since users
    // typically belong to only one high-traffic team.
    // Managed event bookings are only counted when the user is the organizer (userId match),
    // not when they appear as an attendee — a teammate can book another teammate's managed event.
    const seen = new Set<number>();
    const bookings = rows.filter((booking) => {
      // Deduplicate across UNION ALL branches
      if (seen.has(booking.id)) return false;
      seen.add(booking.id);
      // Skip the booking being rescheduled
      if (excludedUid && booking.uid === excludedUid) return false;
      if (!booking.eventTypeId) return false;
      // Team event type bookings: include if user is organizer or attendee
      if (directTeamEventTypeIds.has(booking.eventTypeId)) return true;
      // Managed event type bookings: include only if user is the organizer
      if (managedEventTypeIds.has(booking.eventTypeId)) {
        return booking.userId !== null && userIdSet.has(booking.userId);
      }
      return false;
    });

    if (shouldReturnCount) {
      return bookings.length;
    }

    return bookings;
  }

  async getValidBookingFromEventTypeForAttendee({
    eventTypeId,
    bookerEmail,
    bookerPhoneNumber,
    startTime,
    filterForUnconfirmed,
  }: {
    eventTypeId: number;
    bookerEmail?: string;
    bookerPhoneNumber?: string;
    startTime: Date;
    filterForUnconfirmed?: boolean;
  }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        eventTypeId,
        attendees: {
          some: {
            email: bookerEmail,
            phoneNumber: bookerPhoneNumber,
          },
        },
        startTime,
        status: filterForUnconfirmed ? BookingStatus.PENDING : BookingStatus.ACCEPTED,
      },
      select: {
        id: true,
        uid: true,
        iCalUID: true,
        status: true,
        eventTypeId: true,
        userId: true,
        title: true,
        description: true,
        customInputs: true,
        responses: true,
        startTime: true,
        endTime: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        paid: true,
        destinationCalendarId: true,
        cancellationReason: true,
        rejectionReason: true,
        dynamicEventSlugRef: true,
        dynamicGroupSlugRef: true,
        rescheduled: true,
        fromReschedule: true,
        recurringEventId: true,
        smsReminderNumber: true,
        scheduledJobs: true,
        metadata: true,
        isRecorded: true,
        iCalSequence: true,
        rating: true,
        ratingFeedback: true,
        noShowHost: true,
        oneTimePassword: true,
        cancelledBy: true,
        rescheduledBy: true,
        reassignReason: true,
        reassignById: true,
        userPrimaryEmail: true,
        idempotencyKey: true,
        creationSource: true,
        attendees: {
          select: {
            id: true,
            email: true,
            name: true,
            timeZone: true,
            locale: true,
            phoneNumber: true,
            bookingId: true,
            noShow: true,
            createdAt: true,
          },
        },
        references: {
          select: {
            id: true,
            type: true,
            uid: true,
            meetingId: true,
            thirdPartyRecurringEventId: true,
            meetingPassword: true,
            meetingUrl: true,
            bookingId: true,
            externalCalendarId: true,
            deleted: true,
            credentialId: true,
            delegationCredentialId: true,
            domainWideDelegationCredentialId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            timeZone: true,
            isPlatformManaged: true,
          },
        },
        payment: {
          select: {
            id: true,
            uid: true,
            appId: true,
            bookingId: true,
            amount: true,
            fee: true,
            currency: true,
            success: true,
            refunded: true,
            data: true,
            externalId: true,
            paymentOption: true,
          },
        },
      },
    });
  }

  async countBookingsByEventTypeAndDateRange({
    eventTypeId,
    startDate,
    endDate,
    excludedUid,
  }: {
    eventTypeId: number;
    startDate: Date;
    endDate: Date;
    excludedUid?: string;
  }) {
    return await this.prismaClient.booking.count({
      where: {
        status: BookingStatus.ACCEPTED,
        eventTypeId,
        startTime: {
          gte: startDate,
        },
        endTime: {
          lte: endDate,
        },
        uid: {
          not: excludedUid,
        },
      },
    });
  }

  async findAcceptedBookingByEventTypeId({
    eventTypeId,
    dateFrom,
    dateTo,
  }: {
    eventTypeId?: number;
    dateFrom: string;
    dateTo: string;
  }) {
    return this.prismaClient.booking.findMany({
      where: {
        eventTypeId,
        startTime: {
          gte: dateFrom,
          lte: dateTo,
        },
        status: BookingStatus.ACCEPTED,
      },
      select: {
        uid: true,
        startTime: true,
        attendees: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async getTotalBookingDuration({
    eventId,
    startDate,
    endDate,
    rescheduleUid,
  }: {
    eventId: number;
    startDate: Date;
    endDate: Date;
    rescheduleUid?: string;
  }) {
    let totalBookingTime;

    if (rescheduleUid) {
      [totalBookingTime] = await this.prismaClient.$queryRaw<[{ totalMinutes: number | null }]>`
      SELECT SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60) as "totalMinutes"
      FROM "Booking"
      WHERE "status" = 'accepted'
        AND "eventTypeId" = ${eventId}
        AND "startTime" >= ${startDate}
        AND "endTime" <= ${endDate}
        AND "uid" != ${rescheduleUid};
    `;
    } else {
      [totalBookingTime] = await this.prismaClient.$queryRaw<[{ totalMinutes: number | null }]>`
      SELECT SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60) as "totalMinutes"
      FROM "Booking"
      WHERE "status" = 'accepted'
        AND "eventTypeId" = ${eventId}
        AND "startTime" >= ${startDate}
        AND "endTime" <= ${endDate};
    `;
    }

    // PostgreSQL 16+ returns `numeric` type from EXTRACT(EPOCH FROM ...) instead of `double precision`.
    // Prisma maps `numeric` to a JavaScript Decimal object, which causes string concatenation
    // instead of numeric addition when used with the `+` operator (e.g., Decimal(30) + 30 = "3030").
    // Explicitly convert to a plain number to ensure correct arithmetic in all callers.
    return Number(totalBookingTime.totalMinutes ?? 0);
  }

  async findOriginalRescheduledBookingUserId({ rescheduleUid }: { rescheduleUid: string }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        uid: rescheduleUid,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED, BookingStatus.PENDING],
        },
      },
      select: {
        userId: true,
        attendees: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async getBookingForPaymentProcessing(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        userPrimaryEmail: true,
        status: true,
        eventTypeId: true,
        userId: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
          },
        },
        eventType: {
          select: {
            title: true,
            hideOrganizerEmail: true,
            teamId: true,
            metadata: true,
            team: {
              select: {
                id: true,
                hideBranding: true,
                parent: { select: { hideBranding: true } },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            timeZone: true,
            locale: true,
            hideBranding: true,
            profiles: {
              select: {
                organizationId: true,
                organization: { select: { hideBranding: true } },
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            paymentOption: true,
            appId: true,
            success: true,
            data: true,
          },
        },
      },
    });
  }

  async updateMany({ where, data }: { where: BookingWhereInput; data: BookingUpdateData }) {
    return await this.prismaClient.booking.updateMany({
      where: where,
      data,
    });
  }

  async update({ where, data }: { where: BookingWhereUniqueInput; data: BookingUpdateData }) {
    return await this.prismaClient.booking.update({
      where,
      data,
      select: { id: true },
    });
  }

  async updateNoShowHost({
    bookingUid,
    noShowHost,
  }: {
    bookingUid: string;
    noShowHost: boolean;
  }): Promise<{ id: number }> {
    return await this.prismaClient.booking.update({
      where: { uid: bookingUid },
      data: { noShowHost },
      select: { id: true },
    });
  }

  /**
   * Update a booking and return it with workflow reminders and references
   * Used during booking cancellation to update status and retrieve related data in one query
   */
  async updateIncludeWorkflowRemindersAndReferences({
    where,
    data,
  }: {
    where: BookingWhereUniqueInput;
    data: BookingUpdateData;
  }) {
    return await this.prismaClient.booking.update({
      where,
      data,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        references: {
          select: referenceSelect,
        },
        workflowReminders: {
          select: workflowReminderSelect,
        },
        uid: true,
      },
    });
  }

  /**
   * Find bookings with workflow reminders for cleanup during cancellation
   * Used after bulk cancellation of recurring events
   */
  async findManyIncludeWorkflowRemindersAndReferences({ where }: { where: BookingWhereInput }) {
    return await this.prismaClient.booking.findMany({
      where,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        references: {
          select: referenceSelect,
        },
        workflowReminders: {
          select: workflowReminderSelect,
        },
        uid: true,
      },
    });
  }

  async findByIdIncludeEventTypeAttendeesUserAndReferences(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: selectStatementToGetBookingForCalEventBuilder,
    });
  }

  async getBookingForCalEventBuilderFromUid(bookingUid: string) {
    return this.prismaClient.booking.findUnique({
      where: { uid: bookingUid },
      select: selectStatementToGetBookingForCalEventBuilder,
    });
  }

  /**
   * Fetch a booking for MEETING_STARTED / MEETING_ENDED webhook payloads.
   *
   * Returns the raw booking shape that the legacy scheduleTrigger path stored
   * (all scalar fields + user, attendees, eventType, payment, references).
   */
  async findBookingForMeetingWebhook(bookingUid: string) {
    return this.prismaClient.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        id: true,
        uid: true,
        title: true,
        description: true,
        customInputs: true,
        responses: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        paid: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        userPrimaryEmail: true,
        eventTypeId: true,
        destinationCalendarId: true,
        cancellationReason: true,
        rejectionReason: true,
        reassignReason: true,
        reassignById: true,
        dynamicEventSlugRef: true,
        dynamicGroupSlugRef: true,
        rescheduled: true,
        fromReschedule: true,
        recurringEventId: true,
        smsReminderNumber: true,
        scheduledJobs: true,
        metadata: true,
        isRecorded: true,
        iCalUID: true,
        iCalSequence: true,
        rating: true,
        ratingFeedback: true,
        noShowHost: true,
        cancelledBy: true,
        rescheduledBy: true,
        creationSource: true,
        idempotencyKey: true,
        user: {
          select: {
            email: true,
            name: true,
            username: true,
            timeZone: true,
            locale: true,
            uuid: true,
            isPlatformManaged: true,
          },
        },
        eventType: {
          select: {
            bookingFields: true,
            team: {
              select: {
                logoUrl: true,
                parent: {
                  select: {
                    logoUrl: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        attendees: {
          select: {
            id: true,
            name: true,
            email: true,
            timeZone: true,
            locale: true,
            phoneNumber: true,
            bookingId: true,
            noShow: true,
          },
        },
        payment: {
          select: {
            id: true,
            appId: true,
            bookingId: true,
            amount: true,
            fee: true,
            currency: true,
            success: true,
            refunded: true,
            paymentOption: true,
          },
        },
        references: {
          select: {
            id: true,
            type: true,
            uid: true,
            meetingId: true,
            meetingUrl: true,
            bookingId: true,
          },
        },
      },
    });
  }

  async findByIdForReassignment(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        uid: true,
        eventTypeId: true,
        userId: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async findByIdWithAttendeesPaymentAndReferences(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        uid: true,
        title: true,
        description: true,
        customInputs: true,
        responses: true,
        startTime: true,
        endTime: true,
        metadata: true,
        status: true,
        location: true,
        smsReminderNumber: true,
        iCalUID: true,
        iCalSequence: true,
        eventTypeId: true,
        userId: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
            phoneNumber: true,
          },
          orderBy: {
            id: "asc",
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            timeZone: true,
            locale: true,
            timeFormat: true,
          },
        },
        payment: {
          select: {
            id: true,
          },
        },
        references: {
          select: {
            uid: true,
            type: true,
            meetingUrl: true,
            meetingId: true,
            meetingPassword: true,
            externalCalendarId: true,
            credentialId: true,
            thirdPartyRecurringEventId: true,
            delegationCredentialId: true,
          },
        },
        workflowReminders: {
          select: {
            id: true,
            referenceId: true,
            method: true,
          },
        },
      },
    });
  }

  async updateBookingAttendees({
    bookingId,
    newAttendees,
    updatedResponses,
  }: {
    bookingId: number;
    newAttendees: {
      name: string;
      email: string;
      timeZone: string;
      locale: string | null;
      phoneNumber?: string | null;
    }[];
    updatedResponses: Prisma.InputJsonValue;
  }) {
    return await this.prismaClient.booking.update({
      where: {
        id: bookingId,
      },
      select: {
        attendees: {
          select: {
            id: true,
            email: true,
            name: true,
            timeZone: true,
            locale: true,
            phoneNumber: true,
          },
        },
      },
      data: {
        attendees: {
          createMany: {
            data: newAttendees,
          },
        },
        responses: updatedResponses,
      },
    });
  }

  findByUidIncludeEventTypeAndReferences({ bookingUid }: { bookingUid: string }) {
    return this.prismaClient.booking.findUniqueOrThrow({
      where: {
        uid: bookingUid,
      },
      select: {
        id: true,
        uid: true,
        userId: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        eventTypeId: true,
        userPrimaryEmail: true,
        eventType: {
          select: {
            teamId: true,
            parentId: true,
            slug: true,
            title: true,
            length: true,
            hideOrganizerEmail: true,
            customReplyToEmail: true,
            bookingFields: true,
            metadata: true,
            team: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        },
        location: true,
        attendees: {
          select: {
            id: true,
            email: true,
            name: true,
            timeZone: true,
            locale: true,
            phoneNumber: true,
          },
        },
        references: {
          select: {
            id: true,
            uid: true,
            type: true,
            meetingId: true,
            thirdPartyRecurringEventId: true,
            meetingPassword: true,
            meetingUrl: true,
            bookingId: true,
            externalCalendarId: true,
            deleted: true,
            credentialId: true,
            delegationCredentialId: true,
            domainWideDelegationCredentialId: true,
          },
        },
        customInputs: true,
        dynamicEventSlugRef: true,
        dynamicGroupSlugRef: true,
        destinationCalendar: {
          select: destinationCalendarSelect,
        },
        smsReminderNumber: true,
        workflowReminders: {
          select: workflowReminderSelect,
        },
        responses: true,
        iCalUID: true,
        iCalSequence: true,
      },
    });
  }

  async updateBookingStatus({
    bookingId,
    status,
    cancellationReason,
    cancelledBy,
    rescheduledBy,
    rescheduled,
  }: {
    bookingId: number;
    status?: BookingStatus;
    cancellationReason?: string;
    cancelledBy?: string;
    rescheduledBy?: string;
    rescheduled?: boolean;
  }) {
    return await this.prismaClient.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        ...(status !== undefined && { status }),
        ...(rescheduled !== undefined && { rescheduled }),
        ...(cancellationReason !== undefined && { cancellationReason }),
        ...(cancelledBy !== undefined && { cancelledBy }),
        ...(rescheduledBy !== undefined && { rescheduledBy }),
        updatedAt: new Date().toISOString(),
      },
      select: { id: true },
    });
  }

  /**
   * Cancels a booking as part of the Managed Event reassignment flow.
   * Callers only pass domain data; repository handles persistence details.
   */
  async cancelBookingForManagedEventReassignment({
    bookingId,
    cancellationReason,
    metadata,
    tx,
  }: {
    bookingId: number;
    cancellationReason: string;
    metadata?: Record<string, unknown> | null;
    tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
  }): Promise<ManagedEventCancellationResult> {
    const client = tx ?? this.prismaClient;
    return client.booking.update({
      where: { id: bookingId },
      data: {
        cancellationReason,
        metadata: metadata as unknown as Prisma.InputJsonValue,
        status: BookingStatus.CANCELLED,
      },
      select: {
        id: true,
        uid: true,
        metadata: true,
        status: true,
      },
    });
  }

  /**
   * Creates a booking specifically for Managed Event reassignment flows.
   * Encapsulates the select shape so callers don't deal with Prisma selections.
   */
  async createBookingForManagedEventReassignment(
    params: ManagedEventReassignmentCreateParams
  ): Promise<ManagedEventReassignmentCreatedBooking> {
    const {
      uid,
      userId,
      userPrimaryEmail,
      title,
      description,
      startTime,
      endTime,
      status,
      location,
      smsReminderNumber,
      responses,
      customInputs,
      metadata,
      idempotencyKey,
      eventTypeId,
      attendees,
      paymentId,
      iCalUID,
      iCalSequence,
      tx,
    } = params;
    const client = tx ?? this.prismaClient;
    return client.booking.create({
      data: {
        uid,
        uuid: uuidv7({ msecs: startTime.getTime() }),
        userPrimaryEmail,
        title,
        description,
        startTime,
        endTime,
        status,
        location,
        smsReminderNumber,
        responses: responses ?? undefined,
        customInputs: (customInputs as unknown as Prisma.InputJsonValue) ?? undefined,
        metadata: (metadata as unknown as Prisma.InputJsonValue) ?? undefined,
        idempotencyKey,
        iCalUID,
        iCalSequence,
        eventType: {
          connect: { id: eventTypeId },
        },
        user: {
          connect: { id: userId },
        },
        attendees: {
          createMany: {
            data: attendees.map((attendee) => ({
              name: attendee.name,
              email: attendee.email,
              timeZone: attendee.timeZone,
              locale: attendee.locale,
              phoneNumber: attendee.phoneNumber ?? null,
            })),
          },
        },
        payment: paymentId ? { connect: { id: paymentId } } : undefined,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        metadata: true,
        responses: true,
        iCalUID: true,
        iCalSequence: true,
        smsReminderNumber: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
          },
          orderBy: {
            id: "asc" as const,
          },
        },
      },
    });
  }

  /**
   * Wraps the cancel+create operations for managed events in a single transaction.
   */
  async managedEventReassignmentTransaction({
    bookingId,
    cancellationReason,
    metadata,
    newBookingPlan,
  }: {
    bookingId: number;
    cancellationReason: string;
    metadata?: Record<string, unknown> | null;
    newBookingPlan: Omit<ManagedEventReassignmentCreateParams, "tx">;
  }): Promise<{
    newBooking: ManagedEventReassignmentCreatedBooking;
    cancelledBooking: ManagedEventCancellationResult;
  }> {
    return this.prismaClient.$transaction(async (tx) => {
      const cancelledBooking = await this.cancelBookingForManagedEventReassignment({
        bookingId,
        cancellationReason,
        metadata,
        tx,
      });

      const newBooking = await this.createBookingForManagedEventReassignment({
        ...newBookingPlan,
        tx,
      });

      return { newBooking, cancelledBooking };
    });
  }

  async findByIdForTargetEventTypeSearch(bookingId: number) {
    return this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        eventTypeId: true,
        userId: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async findByIdForWithUserIdAndEventTypeId(bookingId: number) {
    return this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        eventTypeId: true,
        userId: true,
      },
    });
  }

  async findByIdForReassignmentValidation(bookingId: number) {
    return this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        recurringEventId: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async updateRecordedStatus({
    bookingUid,
    isRecorded,
  }: {
    bookingUid: string;
    isRecorded: boolean;
  }): Promise<void> {
    await this.prismaClient.booking.update({
      where: { uid: bookingUid },
      data: { isRecorded },
      select: { id: true },
    });
  }

  async countActiveBookingsForEventType({
    eventTypeId,
    bookerEmail,
  }: {
    eventTypeId: number;
    bookerEmail: string;
  }): Promise<number> {
    return this.prismaClient.booking.count({
      where: {
        eventTypeId,
        startTime: {
          gte: new Date(),
        },
        status: {
          in: [BookingStatus.ACCEPTED],
        },
        attendees: {
          some: {
            email: bookerEmail,
          },
        },
      },
    });
  }

  async findActiveBookingsForEventType({
    eventTypeId,
    bookerEmail,
    limit,
  }: {
    eventTypeId: number;
    bookerEmail: string;
    limit: number;
  }): Promise<
    {
      uid: string;
      startTime: Date;
      attendees: {
        name: string;
        email: string;
        bookingSeat: { referenceUid: string } | null;
      }[];
    }[]
  > {
    return this.prismaClient.booking.findMany({
      where: {
        eventTypeId,
        startTime: {
          gte: new Date(),
        },
        status: {
          in: [BookingStatus.ACCEPTED],
        },
        attendees: {
          some: {
            email: bookerEmail,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
      take: limit,
      select: {
        uid: true,
        startTime: true,
        attendees: {
          select: {
            name: true,
            email: true,
            bookingSeat: {
              select: {
                referenceUid: true,
              },
            },
          },
          where: {
            email: bookerEmail,
          },
        },
      },
    });
  }

  async findByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason({
    bookingUid,
  }: {
    bookingUid: string;
  }) {
    return await this.prismaClient.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        eventType: {
          select: {
            id: true,
            title: true,
            slug: true,
            team: {
              select: {
                id: true,
                parentId: true,
              },
            },
          },
        },
        attendees: {
          select: {
            email: true,
          },
        },
        assignmentReason: {
          select: {
            reasonString: true,
          },
          take: 1,
          orderBy: {
            createdAt: "asc" as const,
          },
        },
        routedFromRoutingFormReponse: {
          select: {
            formId: true,
          },
        },
      },
    });
  }

  async getBookingStatsByAttendee(params: {
    attendeeWhere: { email: string } | { email: { endsWith: string } };
    since: Date;
  }) {
    return this.prismaClient.booking.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: params.since },
        attendees: { some: params.attendeeWhere },
      },
      _count: { id: true },
    });
  }

  async countBookingsByAttendee(params: {
    attendeeWhere: { email: string } | { email: { endsWith: string } };
    since: Date;
  }) {
    return this.prismaClient.booking.count({
      where: {
        createdAt: { gte: params.since },
        attendees: { some: params.attendeeWhere },
      },
    });
  }

  async countDistinctHostsByAttendee(params: {
    attendeeWhere: { email: string } | { email: { endsWith: string } };
    since: Date;
  }): Promise<number> {
    const emailFilter = this.attendeeEmailFilter(params.attendeeWhere);
    const rows = await this.prismaClient.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT b."userId") as count
      FROM "Booking" b
      JOIN "Attendee" a ON a."bookingId" = b."id"
      WHERE b."createdAt" >= ${params.since}
        AND ${emailFilter}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * Returns top N orgs by booking count AND total distinct org count in a single query.
   * Avoids two separate round-trips for getTopOrgs + countDistinctOrgs.
   */
  async getTopOrgsByAttendeeBookings(params: {
    attendeeWhere: { email: string } | { email: { endsWith: string } };
    since: Date;
    limit: number;
  }): Promise<{ topOrgs: Array<{ organizationId: number; bookingCount: number }>; totalOrgCount: number }> {
    const emailFilter = this.attendeeEmailFilter(params.attendeeWhere);

    const rows = await this.prismaClient.$queryRaw<Array<{ organizationId: number; bookingCount: bigint }>>`
      SELECT u."organizationId" as "organizationId", COUNT(*) as "bookingCount"
      FROM "Booking" b
      JOIN "Attendee" a ON a."bookingId" = b."id"
      JOIN "users" u ON u."id" = b."userId"
      WHERE b."createdAt" >= ${params.since}
        AND u."organizationId" IS NOT NULL
        AND ${emailFilter}
      GROUP BY u."organizationId"
      ORDER BY COUNT(*) DESC
    `;

    const totalOrgCount = rows.length;
    const topOrgs = rows.slice(0, params.limit).map((r) => ({
      organizationId: r.organizationId,
      bookingCount: Number(r.bookingCount),
    }));

    return { topOrgs, totalOrgCount };
  }

  async findEventTypeDisableFlagsByUid(uid: string) {
    return this.prismaClient.booking.findUnique({
      where: { uid },
      select: {
        eventType: {
          select: {
            disableCancelling: true,
            disableRescheduling: true,
          },
        },
      },
    });
  }

  private attendeeEmailFilter(where: { email: string } | { email: { endsWith: string } }): Prisma.Sql {
    if ("email" in where && typeof where.email === "string") {
      return Prisma.sql`a."email" = ${where.email}`;
    }
    const raw = (where as { email: { endsWith: string } }).email.endsWith;
    const escaped = raw.replace(/[%_\\]/g, "\\$&");
    return Prisma.sql`a."email" LIKE ${"%" + escaped}`;
  }
}
