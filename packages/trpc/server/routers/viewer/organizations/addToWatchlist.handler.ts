import { getOrganizationWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddToWatchlistInputSchema } from "./addToWatchlist.schema";

type AddToWatchlistOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddToWatchlistInputSchema;
};

export const addToWatchlistHandler = async ({ ctx, input }: AddToWatchlistOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to add to watchlist",
    });
  }

  const service = getOrganizationWatchlistOperationsService(organizationId);

  try {
    return await service.addReportsToWatchlist({
      reportIds: input.reportIds,
      type: input.type,
      description: input.description,
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof WatchlistError) {
      switch (error.code) {
        case WatchlistErrorCode.UNAUTHORIZED:
        case WatchlistErrorCode.PERMISSION_DENIED:
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: error.message,
          });
        case WatchlistErrorCode.NOT_FOUND:
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        case WatchlistErrorCode.ALREADY_IN_WATCHLIST:
        case WatchlistErrorCode.INVALID_EMAIL:
        case WatchlistErrorCode.INVALID_DOMAIN:
        case WatchlistErrorCode.DUPLICATE_ENTRY:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
      }
    }

    throw error;
  }
};
