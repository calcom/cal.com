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
    ctx: { user: { id: user.id, email: user.email }, prisma: prisma },
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
  user: { id: number; email: string };
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
    eventTypeIdsWhereUserIsAdminOrOwener,
    userIdsWhereUserIsOrgAdminOrOwener,
  ] = await Promise.all([
    getEventTypeIdsFromTeamIdsFilter(prisma, filters?.teamIds),
    getAttendeeEmailsFromUserIdsFilter(prisma, user.email, filters?.userIds),
    getEventTypeIdsFromEventTypeIdsFilter(prisma, filters?.eventTypeIds),
    getEventTypeIdsWhereUserIsAdminOrOwner(prisma, membershipConditionWhereUserIsAdminOwner),
    getUserIdsWhereUserIsOrgAdminOrOwner(prisma, membershipConditionWhereUserIsAdminOwner),
  ]);

  const whereClause = {
    OR: [
      {
        userId: user.id,
      },
      {
        attendees: {
          some: {
            email: user.email,
          },
        },
      },
      {
        eventTypeId: {
          in: eventTypeIdsWhereUserIsAdminOrOwener,
        },
      },
      {
        userId: {
          in: userIdsWhereUserIsOrgAdminOrOwener,
        },
      },
      {
        seatsReferences: {
          some: {
            attendee: {
              email: user.email,
            },
          },
        },
      },
    ],
    AND: [
      passedBookingsStatusFilter,
      ...(eventTypeIdsFromTeamIdsFilter
        ? [
            {
              eventTypeId: {
                in: eventTypeIdsFromTeamIdsFilter,
              },
            },
          ]
        : []),
      ...(filters?.userIds && filters.userIds.length > 0
        ? [
            {
              OR: [
                {
                  userId: {
                    in: filters.userIds,
                  },
                },
                ...(attendeeEmailsFromUserIdsFilter?.length
                  ? [
                      {
                        attendees: {
                          some: {
                            email: {
                              in: attendeeEmailsFromUserIdsFilter,
                            },
                          },
                        },
                      },
                    ]
                  : []),
              ],
            },
          ]
        : []),
      ...(eventTypeIdsFromEventTypeIdsFilter
        ? [
            {
              eventTypeId: { in: eventTypeIdsFromEventTypeIdsFilter },
            },
          ]
        : []),

      ...(typeof filters?.attendeeEmail === "string"
        ? [
            {
              attendees: { some: { email: filters.attendeeEmail.trim() } },
            },
          ]
        : []),
      ...(isTextFilterValue(filters?.attendeeEmail)
        ? [
            {
              attendees: {
                some: makeWhereClause({
                  columnName: "email",
                  filterValue: filters.attendeeEmail,
                }),
              },
            },
          ]
        : []),

      ...(typeof filters?.attendeeName === "string"
        ? [
            {
              attendees: { some: { name: filters.attendeeName.trim() } },
            },
          ]
        : []),
      ...(isTextFilterValue(filters?.attendeeName)
        ? [
            {
              attendees: {
                some: makeWhereClause({
                  columnName: "name",
                  filterValue: filters.attendeeName,
                }),
              },
            },
          ]
        : []),

      ...(filters?.afterStartDate
        ? [
            {
              startTime: {
                gte: dayjs.utc(filters.afterStartDate).toDate(),
              },
            },
          ]
        : []),
      ...(filters?.beforeEndDate
        ? [
            {
              endTime: {
                lte: dayjs.utc(filters.beforeEndDate).toDate(),
              },
            },
          ]
        : []),
      ...(filters?.afterUpdatedDate
        ? [
            {
              updatedAt: {
                gte: dayjs.utc(filters.afterUpdatedDate).toDate(),
              },
            },
          ]
        : []),
      ...(filters?.beforeUpdatedDate
        ? [
            {
              updatedAt: {
                lte: dayjs.utc(filters.beforeUpdatedDate).toDate(),
              },
            },
          ]
        : []),
      ...(filters?.afterCreatedDate
        ? [
            {
              createdAt: {
                gte: dayjs.utc(filters.afterCreatedDate).toDate(),
              },
            },
          ]
        : []),
      ...(filters?.beforeCreatedDate
        ? [
            {
              createdAt: {
                lte: dayjs.utc(filters.beforeCreatedDate).toDate(),
              },
            },
          ]
        : []),
    ],
  };

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

      return {
        ...booking,
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
    // Include booking if current user is an attendee, regardless of user ID filter
    .then((users) => users.map((user) => user.email).concat([userEmail]));

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

  return Array.from(new Set([...directEventTypeIds, ...parentEventTypeIds]));
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

async function getUserIdsWhereUserIsOrgAdminOrOwner(
  prisma: PrismaClient,
  membershipCondition: PrismaClientType.MembershipListRelationFilter
) {
  return (
    await prisma.user.findMany({
      where: {
        teams: {
          some: {
            team: {
              isOrganization: true,
              members: membershipCondition,
            },
          },
        },
      },
      select: {
        id: true,
      },
    })
  ).map((user) => user.id);
}
