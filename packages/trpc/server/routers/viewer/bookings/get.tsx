import type { Prisma } from "@prisma/client";
import { BookingStatus } from "@prisma/client";

import { parseRecurringEvent } from "@calcom/lib";
import { bookingMinimalSelect } from "@calcom/prisma";

import type { TRPCEndpointOptions } from "../../../trpc";
import type { getSchema } from "./schemas/getSchema";

export const get = async ({ ctx, input }: TRPCEndpointOptions<typeof getSchema>) => {
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
          status: { notIn: [BookingStatus.PENDING, BookingStatus.CANCELLED, BookingStatus.REJECTED] },
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
      OR: [
        {
          recurringEventId: { not: null },
          status: { equals: BookingStatus.PENDING },
        },
        {
          status: { equals: BookingStatus.PENDING },
        },
      ],
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
  };

  const filtersCombined: Prisma.BookingWhereInput[] =
    input.filters &&
    Object.keys(input.filters).map((key) => {
      return bookingWhereInputFilters[key];
    });

  const passedBookingsStatusFilter = bookingListingFilters[bookingListingByStatus];
  const orderBy = bookingListingOrderby[bookingListingByStatus];
  const bookingsQuery = await prisma.booking.findMany({
    where: {
      OR: [
        {
          userId: user?.id,
        },
        {
          attendees: {
            some: {
              email: user?.email,
            },
          },
        },
        {
          eventType: {
            team: {
              members: {
                some: {
                  userId: user?.id,
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
                email: user?.email,
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
          team: {
            select: {
              name: true,
            },
          },
        },
      },
      status: true,
      paid: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      rescheduled: true,
      references: true,
      seatsReferences: {
        where: {
          attendee: {
            email: user?.email,
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
  });

  const recurringInfoBasic = await prisma.booking.groupBy({
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
      userId: user?.id,
    },
  });

  const recurringInfoExtended = await prisma.booking.groupBy({
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
  });

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
      const bookings = recurringInfoExtended
        .filter((ext) => ext.recurringEventId === info.recurringEventId)
        .reduce<{
          [key in (typeof BookingStatus)[keyof typeof BookingStatus]]: Date[];
        }>(
          (prev, curr) => {
            prev[curr.status].push(curr.startTime);
            return prev;
          },
          { ACCEPTED: [], CANCELLED: [], REJECTED: [], PENDING: [] }
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
