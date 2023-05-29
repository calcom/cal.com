import { parseRecurringEvent } from "@calcom/lib";
import { bookingMinimalSelect } from "@calcom/prisma";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  // using offset actually because cursor pagination requires a unique column
  // for orderBy, but we don't use a unique column in our orderBy
  const take = input.limit ?? 10;
  const skip = input.cursor ?? 0;
  const { prisma, user } = ctx;
  const bookingListingByStatus = input.filters.status;
  const bookingListingFilters: Record<typeof bookingListingByStatus, Prisma.BookingWhereInput> = {
    upcoming: {
      endTime: { gte: new Date() },
      // These changes are needed to not show confirmed recurring events,
      // as rescheduling or cancel for recurring event bookings should be
      // handled separately for each occurrence
      OR: [
        {
          recurringEventId: { not: null },
          status: { equals: BookingStatus.ACCEPTED },
        },
        {
          recurringEventId: { equals: null },
          status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
        },
      ],
    },
    recurring: {
      endTime: { gte: new Date() },
      AND: [
        { NOT: { recurringEventId: { equals: null } } },
        { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] } },
      ],
    },
    past: {
      endTime: { lte: new Date() },
      AND: [
        { NOT: { status: { equals: BookingStatus.CANCELLED } } },
        { NOT: { status: { equals: BookingStatus.REJECTED } } },
      ],
    },
    cancelled: {
      OR: [{ status: { equals: BookingStatus.CANCELLED } }, { status: { equals: BookingStatus.REJECTED } }],
    },
    unconfirmed: {
      endTime: { gte: new Date() },
      status: { equals: BookingStatus.PENDING },
    },
  };
  const bookingListingOrderby: Record<
    typeof bookingListingByStatus,
    Prisma.BookingOrderByWithAggregationInput
  > = {
    upcoming: { startTime: "asc" },
    recurring: { startTime: "asc" },
    past: { startTime: "desc" },
    cancelled: { startTime: "desc" },
    unconfirmed: { startTime: "asc" },
  };

  // TODO: Fix record typing
  const bookingWhereInputFilters: Record<string, Prisma.BookingWhereInput> = {
    teamIds: {
      AND: [
        {
          eventType: {
            team: {
              id: {
                in: input.filters?.teamIds,
              },
            },
          },
        },
      ],
    },
    userIds: {
      AND: [
        {
          eventType: {
            users: {
              some: {
                id: {
                  in: input.filters?.userIds,
                },
              },
            },
          },
        },
      ],
    },
    eventTypeIds: {
      AND: [
        {
          eventTypeId: {
            in: input.filters?.eventTypeIds,
          },
        },
      ],
    },
  };

  const filtersCombined: Prisma.BookingWhereInput[] =
    input.filters &&
    Object.keys(input.filters).map((key) => {
      return bookingWhereInputFilters[key];
    });

  const passedBookingsStatusFilter = bookingListingFilters[bookingListingByStatus];
  const orderBy = bookingListingOrderby[bookingListingByStatus];

  const [bookingsQuery, recurringInfoBasic, recurringInfoExtended] = await Promise.all([
    prisma.booking.findMany({
      where: {
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
            eventType: {
              team: {
                members: {
                  some: {
                    userId: user.id,
                    role: {
                      in: ["ADMIN", "OWNER"],
                    },
                  },
                },
              },
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
        AND: [passedBookingsStatusFilter, ...(filtersCombined ?? [])],
      },
      select: {
        ...bookingMinimalSelect,
        uid: true,
        recurringEventId: true,
        location: true,
        eventType: {
          select: {
            slug: true,
            id: true,
            eventName: true,
            price: true,
            recurringEvent: true,
            currency: true,
            metadata: true,
            team: {
              select: {
                name: true,
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
      },
      orderBy,
      take: take + 1,
      skip,
    }),
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
        { ACCEPTED: [], CANCELLED: [], REJECTED: [], PENDING: [] } as {
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

  const bookings = bookingsQuery.map((booking) => {
    return {
      ...booking,
      eventType: {
        ...booking.eventType,
        recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
        price: booking.eventType?.price || 0,
        currency: booking.eventType?.currency || "usd",
        metadata: EventTypeMetaDataSchema.parse(booking.eventType?.metadata || {}),
      },
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
    };
  });

  const bookingsFetched = bookings.length;
  let nextCursor: typeof skip | null = skip;
  if (bookingsFetched > take) {
    nextCursor += bookingsFetched;
  } else {
    nextCursor = null;
  }

  return {
    bookings,
    recurringInfo,
    nextCursor,
  };
};
