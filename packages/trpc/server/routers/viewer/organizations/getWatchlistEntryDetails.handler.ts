import { getOrganizationWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetWatchlistEntryDetailsInputSchema } from "./getWatchlistEntryDetails.schema";

type GetWatchlistEntryDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetWatchlistEntryDetailsInputSchema;
};

export const getWatchlistEntryDetailsHandler = async ({ ctx, input }: GetWatchlistEntryDetailsOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to view blocklist",
    });
  }

  const service = getOrganizationWatchlistQueryService();

  try {
    return await service.getWatchlistEntryDetails({
      organizationId,
      userId: user.id,
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
