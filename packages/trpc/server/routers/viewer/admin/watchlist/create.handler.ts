import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TCreateWatchlistEntryInputSchema } from "./create.schema";

type CreateWatchlistEntryOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateWatchlistEntryInputSchema;
};

export const createWatchlistEntryHandler = async ({ ctx, input }: CreateWatchlistEntryOptions) => {
  const { user } = ctx;
  const service = getAdminWatchlistOperationsService();

  try {
    return await service.createWatchlistEntry({
      type: input.type,
      value: input.value,
      description: input.description,
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof WatchlistError) {
      switch (error.code) {
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
