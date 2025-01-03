import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { getBookings } from "@calcom/trpc/server/routers/viewer/bookings/get.handler";

import { getOrderBy } from "./getAllUserBookings";

// Status types
enum Status {
  cancelled = "cancelled",
  accepted = "accepted",
  rejected = "rejected",
  pending = "pending",
  awaitingHost = "awaitingHost",
  // Legacy statuses for backwards compatibility
  upcoming = "upcoming",
  past = "past",
  recurring = "recurring",
  unconfirmed = "unconfirmed",
}
type StatusType = keyof typeof Status;

// Time range types
enum TimeRange {
  upcoming = "upcoming",
  past = "past",
}
type TimeRangeType = keyof typeof TimeRange;

// Booking type
enum BookingType {
  recurring = "recurring",
}
type BookingTypeType = keyof typeof BookingType;

type SortOptions = {
  sortStart?: "asc" | "desc";
  sortEnd?: "asc" | "desc";
  sortCreated?: "asc" | "desc";
};

type GetOptions = {
  ctx: {
    user: { id: number; email: string };
    prisma: PrismaClient;
  };
  bookingListingByStatus: StatusType[];
  take: number;
  skip: number;
  filters: {
    status?: StatusType[];
    timeRange?: TimeRangeType[];
    type?: BookingTypeType[];
    teamIds?: number[];
    userIds?: number[];
    eventTypeIds?: number[];
    attendeeEmail?: string;
    attendeeName?: string;
  };
  sort?: SortOptions;
};

const getAllUserBookings2024 = async ({
  ctx,
  filters,
  bookingListingByStatus,
  take,
  skip,
  sort,
}: GetOptions) => {
  const { prisma, user } = ctx;
  const now = new Date();

  // Convert filters to bookingListingByStatus for backward compatibility
  const statusFilters = filters.status || [];
  const timeRangeFilters = filters.timeRange || [];
  const typeFilters = filters.type || [];

  // Combine all filters for backward compatibility
  const combinedFilters = [...statusFilters, ...timeRangeFilters, ...typeFilters];
  const effectiveBookingListingByStatus =
    combinedFilters.length > 0 ? combinedFilters : bookingListingByStatus;

  const bookingListingFilters: Record<StatusType, Prisma.BookingWhereInput> = {
    upcoming: {
      endTime: { gte: now },
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
      recurringEventId: { not: null },
      status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
    },
    past: {
      endTime: { lt: now },
    },
    cancelled: {
      status: { equals: BookingStatus.CANCELLED },
    },
    unconfirmed: {
      status: { equals: BookingStatus.PENDING },
    },
    accepted: {
      status: { equals: BookingStatus.ACCEPTED },
    },
    rejected: {
      status: { equals: BookingStatus.REJECTED },
    },
    pending: {
      status: { equals: BookingStatus.PENDING },
    },
    awaitingHost: {
      status: { equals: BookingStatus.PENDING },
    },
  };

  const orderBy = getOrderBy(effectiveBookingListingByStatus, sort);

  const combinedBookingFilters = effectiveBookingListingByStatus.map(
    (status) => bookingListingFilters[status]
  );

  const { bookings, recurringInfo } = await getBookings({
    user,
    prisma,
    passedBookingsStatusFilter: {
      OR: combinedBookingFilters,
    },
    filters,
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

export default getAllUserBookings2024;
