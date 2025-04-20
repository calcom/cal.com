import { Prisma as PrismaClientType } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { makeWhereClause } from "@calcom/features/data-table/lib/server";
import { isTextFilterValue } from "@calcom/features/data-table/lib/utils";
import { parseRecurringEvent, parseEventTypeColor } from "@calcom/lib";
import getAllUserBookings from "@calcom/lib/bookings/getAllUserBookings";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import { bookingMinimalSelect } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { type BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

const log = logger.getSubLogger({ prefix: ["bookings.get"] });

export const getHandler = async ({ ctx, input }: GetOptions) => {
  // using offset actually because cursor pagination requires a unique column
  // for orderBy, but we don't use a unique column in our orderBy
  const take = input.limit;
  const skip = input.offset;
  const { prisma, user } = ctx;
  const defaultStatus = "upcoming";
  const bookingListingByStatus = [input.filters.status || defaultStatus];

  const { bookings, recurringInfo, totalCount } = await getAllUserBookings({
    ctx: {
      user: { id: user.id, email: user.email, orgId: user?.profile?.organizationId },
      prisma: prisma,
    },
    bookingListingByStatus: bookingListingByStatus,
    take,
    skip,
    filters: input.filters,
  });

  return {
    bookings,
    recurringInfo,
    totalCount,
  };
};

export async function getBookings({
  user,
  prisma,
  passedBookingsStatusFilter,
  filters,
  orderBy,
  take,
  skip,
}: {
  user: { id: number; email: string; orgId?: number | null };
  filters: TGetInputSchema["filters"];
  prisma: PrismaClient;
  passedBookingsStatusFilter: Prisma.BookingWhereInput;
  orderBy: Prisma.BookingOrderByWithAggregationInput;
  take: number;
  skip: number;
}) {
  const bookingSelect = {
    ...bookingMinimalSelect,
    uid: true,
    responses: true,
    /**
     * Who uses it -
     * 1. We need to be able to decide which booking can have a 'Reroute' action
     */
    routedFromRoutingFormReponse: {
      select: {
        id: true,
      },
    },
    recurringEventId: true,
    location: true,
    eventType: {
      select: {
        slug: true,
        id: true,
        title: true,
        eventName: true,
        price: true,
        recurringEvent: true,
        currency: true,
        metadata: true,
        disableGuests: true,
        seatsShowAttendees: true,
        seatsShowAvailabilityCount: true,
        eventTypeColor: true,
        allowReschedulingPastBookings: true,
        disableCancelling: true,
        disableRescheduling: true,
        schedulingType: true,
        length: true,
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    },
    status: true,
    paid: true,
    payment: {
      select: {
        paymentOption: true,
        amount: true,
        currency: true,
        success: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    fromReschedule: true,
    rescheduled: true,
    references: true,
    isRecorded: true,
    seatsReferences: {
      where: {
        attendee: {
          email: user.email,
        },
      },
      select: {
        referenceUid: true,
        attendee: {
          select: {
            email: true,
          },
        },
      },
    },
    assignmentReason: {
      orderBy: { createdAt: PrismaClientType.SortOrder.desc },
      take: 1,
    },
  };

  const membershipIdsWhereUserIsAdminOwner = (
    await prisma.membership.findMany({
      where: {
        userId: user.id,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
      select: {
        id: true,
      },
    })
  ).map((membership) => membership.id);

  const membershipConditionWhereUserIsAdminOwner = {
    some: {
      id: { in: membershipIdsWhereUserIsAdminOwner },
    },
  };

  const [
    eventTypeIdsFromTeamIdsFilter,
    attendeeEmailsFromUserIdsFilter,
    eventTypeIdsFromEventTypeIdsFilter,
    eventTypeIdsWhereUserIsAdminOrOwner,
    userIdsAndEmailsWhereUserIsAdminOrOwner,
  ] = await Promise.all([
    getEventTypeIdsFromTeamIdsFilter(prisma, filters?.teamIds),
    getAttendeeEmailsFromUserIdsFilter(prisma, user.email, filters?.userIds),
    getEventTypeIdsFromEventTypeIdsFilter(prisma, filters?.eventTypeIds),
    getEventTypeIdsWhereUserIsAdminOrOwner(prisma, membershipConditionWhereUserIsAdminOwner),
    getUserIdsAndEmailsWhereUserIsAdminOrOwner(prisma, membershipConditionWhereUserIsAdminOwner, user.orgId),
  ]);

  // If user is organization owner/admin, contains organization members emails and ids (organization plan)
  // If user is only team owner/admin, contain team members emails and ids (teams plan)
  const [userIdsWhereUserIsAdminOrOwner, userEmailsWhereUserIsAdminOrOwner] =
    userIdsAndEmailsWhereUserIsAdminOrOwner;
  const orConditions = [];

  // If userIds filter is provided
  if (!!filters?.userIds && filters.userIds.length > 0) {
    const areUserIdsWithinUserOrgOrTeam = filters.userIds.every((userId) =>
      userIdsWhereUserIsAdminOrOwner.includes(userId)
    );

    //  Scope depends on `user.orgId`:
    // - Throw an error if trying to filter by usersIds that are not within your ORG
    // - Throw an error if trying to filter by usersIds that are not within your TEAM
    if (!areUserIdsWithinUserOrgOrTeam) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permissions to fetch bookings for specified userIds",
      });
    }

    // Filtered view: Booking must match one of the specified users or their attendees
    const usersFilter = { in: [...filters.userIds] };
    const attendeesEmailFilter = { in: attendeeEmailsFromUserIdsFilter };

    // 1. Booking created by one of the filtered users
    orConditions.push({ userId: usersFilter });
    // 2. Attendee email matches one of the filtered users' emails
    orConditions.push({ attendees: { some: { email: attendeesEmailFilter } } });
    // 3. Seat reference attendee email matches one of the filtered users' emails
    orConditions.push({ seatsReferences: { some: { attendee: { email: attendeesEmailFilter } } } });
  } else {
    // Filter by emails for auth user.
    const userEmailFilter = { equals: user.email };
    // Auth user is ORG_OWNER/ADMIN or TEAM_OWNER/ADMIN, filter by emails of members of the organization or team
    const userEmailsFilterWhereUserIsOrgAdminOrOwner = userEmailsWhereUserIsAdminOrOwner?.length
      ? { in: userEmailsWhereUserIsAdminOrOwner }
      : undefined;

    // 1. Current user created bookings
    orConditions.push({ userId: { equals: user.id } });
    // 2. Current user is an attendee
    orConditions.push({ attendees: { some: { email: userEmailFilter } } });
    // 3. Current user is an attendee via seats reference
    orConditions.push({ seatsReferences: { some: { attendee: { email: userEmailFilter } } } });
    // 4. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN so we get bookings where organization members are attendees
    // - If Current user is TEAM_OWNER/ADMIN so we get bookings where team members are attendees
    userEmailsFilterWhereUserIsOrgAdminOrOwner &&
      orConditions.push({ attendees: { some: { email: userEmailsFilterWhereUserIsOrgAdminOrOwner } } });
    // 5. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN so we get bookings where organization members are attendees via seatsReference
    // - If Current user is TEAM_OWNER/ADMIN so we get bookings where team members are attendees via seatsReference
    userEmailsFilterWhereUserIsOrgAdminOrOwner &&
      orConditions.push({
        seatsReferences: { some: { attendee: { email: userEmailsFilterWhereUserIsOrgAdminOrOwner } } },
      });
    // 6. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN, get booking created for an event type within the organization
    // - If Current user is TEAM_OWNER/ADMIN, get bookings created for an event type within the team
    eventTypeIdsWhereUserIsAdminOrOwner?.length &&
      orConditions.push({ eventTypeId: { in: eventTypeIdsWhereUserIsAdminOrOwner } });
    // 7. Scope depends on `user.orgId`:
    // - If Current user is ORG_OWNER/ADMIN, get bookings created by users within the same organization
    // - If Current user is TEAM_OWNER/ADMIN, get bookings created by users within the same organization
    userIdsWhereUserIsAdminOrOwner?.length &&
      orConditions.push({ userId: { in: userIdsWhereUserIsAdminOrOwner } });
  }

  const andConditions = [];

  // 1. Apply mandatory status filter
  andConditions.push(passedBookingsStatusFilter);

  // 2. Filter by Event Type IDs derived from Team IDs (if provided)
  if (eventTypeIdsFromTeamIdsFilter && eventTypeIdsFromTeamIdsFilter.length > 0) {
    andConditions.push({ eventTypeId: { in: eventTypeIdsFromTeamIdsFilter } });
  }

  // 3. Filter by specific Event Type IDs (if provided)
  // If both teamIds filter and eventTypeIds filter are provided, filter 2. ensures the event-types are within the teams
  if (eventTypeIdsFromEventTypeIdsFilter && eventTypeIdsFromEventTypeIdsFilter.length > 0) {
    andConditions.push({ eventTypeId: { in: eventTypeIdsFromEventTypeIdsFilter } });
  }

  // 4. Filter by Attendee Email (if provided)
  if (filters?.attendeeEmail) {
    if (typeof filters.attendeeEmail === "string") {
      // Simple string match (exact)
      andConditions.push({ attendees: { some: { email: filters.attendeeEmail.trim() } } });
    } else if (isTextFilterValue(filters.attendeeEmail)) {
      // Complex text filter (contains, startsWith, etc.) using makeWhereClause
      andConditions.push({
        attendees: {
          some: makeWhereClause({
            columnName: "email",
            filterValue: filters.attendeeEmail,
          }),
        },
      });
    }
  }

  // 5. Filter by Attendee Name (if provided)
  if (filters?.attendeeName) {
    if (typeof filters.attendeeName === "string") {
      // Simple string match (exact)
      andConditions.push({ attendees: { some: { name: filters.attendeeName.trim() } } });
    } else if (isTextFilterValue(filters.attendeeName)) {
      // Complex text filter (contains, startsWith, etc.) using makeWhereClause
      andConditions.push({
        attendees: {
          some: makeWhereClause({
            columnName: "name",
            filterValue: filters.attendeeName,
          }),
        },
      });
    }
  }

  // 6. Date Range Filters
  if (filters?.afterStartDate) {
    andConditions.push({ startTime: { gte: dayjs.utc(filters.afterStartDate).toDate() } });
  }
  if (filters?.beforeEndDate) {
    andConditions.push({ endTime: { lte: dayjs.utc(filters.beforeEndDate).toDate() } });
  }
  if (filters?.afterUpdatedDate) {
    andConditions.push({ updatedAt: { gte: dayjs.utc(filters.afterUpdatedDate).toDate() } });
  }
  if (filters?.beforeUpdatedDate) {
    andConditions.push({ updatedAt: { lte: dayjs.utc(filters.beforeUpdatedDate).toDate() } });
  }
  if (filters?.afterCreatedDate) {
    andConditions.push({ createdAt: { gte: dayjs.utc(filters.afterCreatedDate).toDate() } });
  }
  if (filters?.beforeCreatedDate) {
    andConditions.push({ createdAt: { lte: dayjs.utc(filters.beforeCreatedDate).toDate() } });
  }

  const whereClause = {
    OR: orConditions,
    AND: andConditions,
  };

  log.info(`Get bookings where clause for user ${user.id}`, JSON.stringify(whereClause));

  const [plainBookings, totalCount] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      select: bookingSelect,
      orderBy,
      take,
      skip,
    }),
    prisma.booking.count({
      where: whereClause,
    }),
  ]);

  const [
    recurringInfoBasic,
    recurringInfoExtended,
    // We need all promises to be successful, so we are not using Promise.allSettled
  ] = await Promise.all([
    prisma.booking.groupBy({
      by: ["recurringEventId"],
      _min: {
        startTime: true,
      },
      _count: {
        recurringEventId: true,
      },
      where: {
        recurringEventId: {
          not: { equals: null },
        },
        userId: user.id,
      },
    }),
    prisma.booking.groupBy({
      by: ["recurringEventId", "status", "startTime"],
      _min: {
        startTime: true,
      },
      where: {
        recurringEventId: {
          not: { equals: null },
        },
        userId: user.id,
      },
    }),
  ]);

  const recurringInfo = recurringInfoBasic.map(
    (
      info: (typeof recurringInfoBasic)[number]
    ): {
      recurringEventId: string | null;
      count: number;
      firstDate: Date | null;
      bookings: {
        [key: string]: Date[];
      };
    } => {
      const bookings = recurringInfoExtended.reduce(
        (prev, curr) => {
          if (curr.recurringEventId === info.recurringEventId) {
            prev[curr.status].push(curr.startTime);
          }
          return prev;
        },
        { ACCEPTED: [], CANCELLED: [], REJECTED: [], PENDING: [], AWAITING_HOST: [] } as {
          [key in BookingStatus]: Date[];
        }
      );
      return {
        recurringEventId: info.recurringEventId,
        count: info._count.recurringEventId,
        firstDate: info._min.startTime,
        bookings,
      };
    }
  );

  // Now enrich bookings with relation data. We could have queried the relation data along with the bookings, but that would cause unnecessary queries to the database.
  // Because Prisma is also going to query the select relation data sequentially, we are fine querying it separately here as it would be just 1 query instead of 4
  log.info(
    `fetching all bookings for ${user.id}`,
    safeStringify({
      ids: plainBookings.map((booking) => booking.id),
      filters,
      orderBy,
      take,
      skip,
    })
  );

  const bookings = await Promise.all(
    plainBookings.map(async (booking) => {
      // If seats are enabled and the event is not set to show attendees, filter out attendees that are not the current user
      if (booking.seatsReferences.length && !booking.eventType?.seatsShowAttendees) {
        booking.attendees = booking.attendees.filter((attendee) => attendee.email === user.email);
      }

      let rescheduler = null;
      if (booking.fromReschedule) {
        const rescheduledBooking = await prisma.booking.findUnique({
          where: {
            uid: booking.fromReschedule,
          },
          select: {
            rescheduledBy: true,
          },
        });
        if (rescheduledBooking) {
          rescheduler = rescheduledBooking.rescheduledBy;
        }
      }

      return {
        ...booking,
        rescheduler,
        eventType: {
          ...booking.eventType,
          recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
          eventTypeColor: parseEventTypeColor(booking.eventType?.eventTypeColor),
          price: booking.eventType?.price || 0,
          currency: booking.eventType?.currency || "usd",
          metadata: EventTypeMetaDataSchema.parse(booking.eventType?.metadata || {}),
        },
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
      };
    })
  );
  return { bookings, recurringInfo, totalCount };
}

async function getEventTypeIdsFromTeamIdsFilter(prisma: PrismaClient, teamIds?: number[]) {
  if (!teamIds || teamIds.length === 0) {
    return undefined;
  }

  const [directTeamEventTypeIds, parentTeamEventTypeIds] = await Promise.all([
    prisma.eventType
      .findMany({
        where: {
          teamId: { in: teamIds },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),

    prisma.eventType
      .findMany({
        where: {
          parent: {
            teamId: { in: teamIds },
          },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),
  ]);

  return Array.from(new Set([...directTeamEventTypeIds, ...parentTeamEventTypeIds]));
}

async function getAttendeeEmailsFromUserIdsFilter(
  prisma: PrismaClient,
  userEmail: string,
  userIds?: number[]
) {
  if (!userIds || userIds.length === 0) {
    return;
  }

  const attendeeEmailsFromUserIdsFilter = await prisma.user
    .findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        email: true,
      },
    })
    .then((users) => users.map((user) => user.email));

  if (!attendeeEmailsFromUserIdsFilter || attendeeEmailsFromUserIdsFilter?.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The requested users do not exist.",
    });
  }

  return attendeeEmailsFromUserIdsFilter;
}

async function getEventTypeIdsFromEventTypeIdsFilter(prisma: PrismaClient, eventTypeIds?: number[]) {
  if (!eventTypeIds || eventTypeIds.length === 0) {
    return undefined;
  }
  const [directEventTypeIds, parentEventTypeIds] = await Promise.all([
    prisma.eventType
      .findMany({
        where: {
          id: { in: eventTypeIds },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),

    prisma.eventType
      .findMany({
        where: {
          parent: {
            id: {
              in: eventTypeIds,
            },
          },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),
  ]);

  const eventTypeIdsFromDb = Array.from(new Set([...directEventTypeIds, ...parentEventTypeIds]));

  if (eventTypeIdsFromDb?.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The requested event-types do not exist.",
    });
  }

  return eventTypeIdsFromDb;
}

async function getEventTypeIdsWhereUserIsAdminOrOwner(
  prisma: PrismaClient,
  membershipCondition: PrismaClientType.MembershipListRelationFilter
) {
  const [directTeamEventTypeIds, parentTeamEventTypeIds] = await Promise.all([
    prisma.eventType
      .findMany({
        where: {
          team: {
            members: membershipCondition,
          },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),

    prisma.eventType
      .findMany({
        where: {
          parent: {
            team: {
              members: membershipCondition,
            },
          },
        },
        select: {
          id: true,
        },
      })
      .then((eventTypes) => eventTypes.map((eventType) => eventType.id)),
  ]);

  return Array.from(new Set([...directTeamEventTypeIds, ...parentTeamEventTypeIds]));
}

/**
 * Gets [IDs, Emails] of members where the auth user is admin/owner.
 * Scope depends on `orgId`:
 * - If set (number): Fetches members of that specific organization (`isOrganization: true`).
 * - If unset (null/undefined): Fetches members of all teams (`isOrganization: false`)
 * where the auth user meets the `membershipCondition`.
 *
 * @param prisma The Prisma client.
 * @param membershipCondition Filter defining the auth user's required role (e.g., OWNER/ADMIN)
 * to identify the target orgs/teams.
 * @param orgId Optional ID to target a specific org; absence targets teams.
 * @returns {Promise<[number[], string[]]>} [UserIDs, UserEmails] for members in the determined scope.
 */
async function getUserIdsAndEmailsWhereUserIsAdminOrOwner(
  prisma: PrismaClient,
  membershipCondition: PrismaClientType.MembershipListRelationFilter,
  orgId?: number | null
): Promise<[number[], string[]]> {
  const users = await prisma.user.findMany({
    where: {
      teams: {
        some: {
          team: orgId
            ? {
                isOrganization: true,
                members: membershipCondition,
                id: orgId,
              }
            : { isOrganization: false, members: membershipCondition, parentId: null },
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  });
  return [users.map((user) => user.id), users.map((user) => user.email)];
}
