import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import logger from "@calcom/lib/logger";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../../types";
import type { TDeleteWatchlistEntryInputSchema } from "./delete.schema";

type DeleteWatchlistEntryOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteWatchlistEntryInputSchema;
};

export const deleteWatchlistEntryHandler = async ({ ctx, input }: DeleteWatchlistEntryOptions) => {
  const { user } = ctx;
  const service = getAdminWatchlistOperationsService();

  try {
    return await service.deleteWatchlistEntry({
      entryId: input.id,
      userId: user.id,
    });
  } catch (error) {
    logger.error("Failed to delete system blocklist entry", { error });

    if (error instanceof WatchlistError) {
      switch (error.code) {
        case WatchlistErrorCode.NOT_FOUND:
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
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
      message: "Failed to delete system blocklist entry",
    });
  }
};
