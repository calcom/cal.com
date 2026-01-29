import type { Kysely } from "kysely";

import { getGetBookingsRepository } from "@calcom/features/bookings/di/GetBookingsRepository.container";
import type { TextFilterValue } from "@calcom/features/data-table/lib/types";
import type { DB } from "@calcom/kysely";
import type { PrismaClient } from "@calcom/prisma";

type InputByStatus = "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";
export type SortOptions = {
  sortStart?: "asc" | "desc";
  sortEnd?: "asc" | "desc";
  sortCreated?: "asc" | "desc";
  sortUpdated?: "asc" | "desc";
};
type GetOptions = {
  ctx: {
    user: { id: number; email: string; orgId?: number | null };
    prisma: PrismaClient;
    kysely: Kysely<DB>;
  };
  bookingListingByStatus: InputByStatus[];
  take: number;
  skip: number;
  filters: {
    // Support both singular 'status' (for API v2) and plural 'statuses' (/bookings page)
    status?: InputByStatus;
    statuses?: InputByStatus[];
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    eventTypeIds?: number[] | undefined;
    attendeeEmail?: string | TextFilterValue;
    attendeeName?: string | TextFilterValue;
    bookingUid?: string | undefined;
  };
  sort?: SortOptions;
};

/**
 * Gets all user bookings for API v2.
 * This function uses the full projection to maintain backward compatibility
 * with the existing API v2 contract.
 */
const getAllUserBookings = async ({ ctx, filters, bookingListingByStatus, take, skip, sort }: GetOptions) => {
  const { user, kysely } = ctx;

  // Support both singular 'status' and plural 'statuses' for backward compatibility
  // Note: filters can be undefined at runtime despite the type definition, e.g., when
  // API endpoints are called without query parameters (found in managed-user-bookings.e2e-spec.ts).
  // Use optional chaining to handle this defensively.
  const statusesFilter = filters?.statuses ?? (filters?.status ? [filters.status] : bookingListingByStatus);

  const repository = getGetBookingsRepository();
  const { bookings, recurringInfo, totalCount } = await repository.findManyForApiV2({
    user,
    kysely,
    bookingListingByStatus,
    filters: {
      ...filters,
      statuses: statusesFilter,
    },
    sort,
    take,
    skip,
  });

  return {
    bookings,
    recurringInfo,
    totalCount,
  };
};

export default getAllUserBookings;
