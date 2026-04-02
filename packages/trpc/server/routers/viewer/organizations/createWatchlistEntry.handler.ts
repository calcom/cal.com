import { getOrganizationWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import logger from "@calcom/lib/logger";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TCreateWatchlistEntryInputSchema } from "./createWatchlistEntry.schema";

type CreateWatchlistEntryOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateWatchlistEntryInputSchema;
};

export const createWatchlistEntryHandler = async ({ ctx, input }: CreateWatchlistEntryOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to manage blocklist",
    });
  }

  const service = getOrganizationWatchlistOperationsService(organizationId);

  try {
    return await service.createWatchlistEntry({
      type: input.type,
      value: input.value,
      description: input.description,
      userId: user.id,
    });
  } catch (error) {
    logger.error("Failed to create blocklist entry", { error });
    if (error instanceof WatchlistError) {
      switch (error.code) {
        case WatchlistErrorCode.UNAUTHORIZED:
        case WatchlistErrorCode.PERMISSION_DENIED:
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: error.message,
          });
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
