import { getGetBookingsRepositoryForWeb } from "@calcom/features/bookings/di/GetBookingsRepository.container";
import { GetBookingsRepositoryForApiV2 } from "@calcom/features/bookings/repositories/GetBookingsRepositoryForApiV2";
import type { DB } from "@calcom/kysely";
import kysely from "@calcom/kysely";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import type { Kysely } from "kysely";
import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

type InputByStatus = "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";

/**
 * tRPC handler for fetching bookings for the web app.
 * Uses findManyForWeb() which returns only the fields needed by the web UI,
 * excluding sensitive or unnecessary fields like BookingReference.credentialId,
 * BookingReference.meetingPassword, etc.
 */
export const getHandler = async ({ ctx, input }: GetOptions) => {
  // Support both offset-based (list) and cursor-based pagination (calendar)
  // Cursor is just the offset as a string (fake cursor pagination)
  const take = input.limit;
  let skip = input.offset;

  // If cursor is provided, parse it to get the offset
  if (input.cursor) {
    const parsedCursor = parseInt(input.cursor, 10);
    if (!isNaN(parsedCursor) && parsedCursor >= 0) {
      skip = parsedCursor;
    }
  }

  const { user } = ctx;
  const defaultStatus = "upcoming";

  const bookingListingByStatus = input.filters.statuses?.length
    ? input.filters.statuses
    : [input.filters.status || defaultStatus];

  // Support both singular 'status' and plural 'statuses' for backward compatibility
  const statusesFilter =
    input.filters?.statuses ?? (input.filters?.status ? [input.filters.status] : bookingListingByStatus);

  const repository = getGetBookingsRepositoryForWeb();
  const { bookings, recurringInfo, totalCount } = await repository.findMany({
    user: { id: user.id, email: user.email, orgId: user?.profile?.organizationId },
    kysely,
    bookingListingByStatus,
    filters: {
      ...input.filters,
      statuses: statusesFilter,
    },
    sort: input.sort,
    take,
    skip,
  });

  // Generate next cursor for infinite query support
  const nextOffset = skip + take;
  const hasMore = nextOffset < totalCount;
  const nextCursor = hasMore ? nextOffset.toString() : undefined;

  return {
    bookings,
    recurringInfo,
    totalCount,
    nextCursor,
  };
};

/**
 * @deprecated Use GetBookingsRepositoryForApiV2.findMany() directly instead.
 * This function is kept for backward compatibility with existing tests and consumers.
 * It delegates to the repository with full field projection (API v2 compatibility).
 */
export async function getBookings({
  user,
  prisma: _prisma,
  kysely,
  bookingListingByStatus,
  sort,
  filters,
  take,
  skip,
}: {
  user: { id: number; email: string; orgId?: number | null };
  filters: TGetInputSchema["filters"];
  prisma: PrismaClient;
  kysely: Kysely<DB>;
  bookingListingByStatus: InputByStatus[];
  sort?: {
    sortStart?: "asc" | "desc";
    sortEnd?: "asc" | "desc";
    sortCreated?: "asc" | "desc";
    sortUpdated?: "asc" | "desc";
  };
  take: number;
  skip: number;
}) {
  const repository = new GetBookingsRepositoryForApiV2({ prismaClient: _prisma });
  return repository.findMany({
    user,
    kysely,
    bookingListingByStatus,
    filters,
    sort,
    take,
    skip,
  });
}
