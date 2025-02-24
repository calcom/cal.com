import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { getBookings } from "@calcom/trpc/server/routers/viewer/bookings/get.handler";

type InputByStatus = "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";
type SortOptions = {
  sortStart?: "asc" | "desc";
  sortEnd?: "asc" | "desc";
  sortCreated?: "asc" | "desc";
  sortUpdated?: "asc" | "desc";
};
type GetOptions = {
  ctx: {
    user: { id: number; email: string };
    prisma: PrismaClient;
  };
  bookingListingByStatus: InputByStatus[];
  take: number;
  skip: number;
  filters: {
    status?: InputByStatus;
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    eventTypeIds?: number[] | undefined;
    attendeeEmail?: string;
    attendeeName?: string;
  };
  sort?: SortOptions;
};

const getAllUserBookings = async ({ ctx, filters, bookingListingByStatus, take, skip, sort }: GetOptions) => {
  const { prisma, user } = ctx;

  const bookingListingFilters: Record<InputByStatus, Prisma.BookingWhereInput> = {
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

  const orderBy = getOrderBy(bookingListingByStatus, sort);

  const combinedFilters = bookingListingByStatus.map((status) => bookingListingFilters[status]);

  const { bookings, recurringInfo } = await getBookings({
    user,
    prisma,
    passedBookingsStatusFilter: {
      OR: combinedFilters,
    },
    filters: filters,
    orderBy,
    take,
    skip,
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

function getOrderBy(
  bookingListingByStatus: InputByStatus[],
  sort?: SortOptions
): Prisma.BookingOrderByWithAggregationInput {
  const bookingListingOrderby: Record<InputByStatus, Prisma.BookingOrderByWithAggregationInput> = {
    upcoming: { startTime: "asc" },
    recurring: { startTime: "asc" },
    past: { startTime: "desc" },
    cancelled: { startTime: "desc" },
    unconfirmed: { startTime: "asc" },
  };

  if (bookingListingByStatus?.length === 1 && !sort) {
    return bookingListingOrderby[bookingListingByStatus[0]];
  }

  if (sort?.sortStart) {
    return { startTime: sort.sortStart };
  }
  if (sort?.sortEnd) {
    return { endTime: sort.sortEnd };
  }
  if (sort?.sortCreated) {
    return { createdAt: sort.sortCreated };
  }
  if (sort?.sortUpdated) {
    return { updatedAt: sort.sortUpdated };
  }

  return { startTime: "asc" };
}

export default getAllUserBookings;
