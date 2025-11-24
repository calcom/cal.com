import type { Kysely } from "kysely";

import type { TextFilterValue } from "@calcom/features/data-table/lib/types";
import type { DB } from "@calcom/kysely";
import type { PrismaClient } from "@calcom/prisma";
import { getBookings } from "@calcom/trpc/server/routers/viewer/bookings/get.handler";

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
    status?: InputByStatus;
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    eventTypeIds?: number[] | undefined;
    attendeeEmail?: string | TextFilterValue;
    attendeeName?: string | TextFilterValue;
    bookingUid?: string | undefined;
    afterStartDate?: string;
    beforeEndDate?: string;
    afterUpdatedDate?: string;
    beforeUpdatedDate?: string;
    afterCreatedDate?: string;
    beforeCreatedDate?: string;
  };
  sort?: SortOptions;
};

const getAllUserBookings = async ({ ctx, filters, bookingListingByStatus, take, skip, sort }: GetOptions) => {
  const { prisma, user, kysely } = ctx;

  // Call the main booking query handler
  // All RFC 5545 pattern logic is handled there
  const { bookings, recurringInfo, totalCount } = await getBookings({
    user,
    prisma,
    kysely,
    bookingListingByStatus,
    filters: filters,
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
