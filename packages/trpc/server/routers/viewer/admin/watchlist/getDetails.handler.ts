import { getAdminWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TGetWatchlistEntryDetailsInputSchema } from "./getDetails.schema";

type GetWatchlistEntryDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetWatchlistEntryDetailsInputSchema;
};

export const getWatchlistEntryDetailsHandler = async ({ input }: GetWatchlistEntryDetailsOptions) => {
  const service = getAdminWatchlistQueryService();

  try {
    return await service.getWatchlistEntryDetails({
      entryId: input.id,
    });
  } catch (error) {
    if (error instanceof WatchlistError) {
      switch (error.code) {
        case WatchlistErrorCode.NOT_FOUND:
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        case WatchlistErrorCode.UNAUTHORIZED:
        case WatchlistErrorCode.PERMISSION_DENIED:
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message,
          });
        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
      }
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get blocklist entry details",
    });
  }
};
