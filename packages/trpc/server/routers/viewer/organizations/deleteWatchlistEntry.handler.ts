import { getOrganizationWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TDeleteWatchlistEntryInputSchema } from "./deleteWatchlistEntry.schema";

type DeleteWatchlistEntryOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteWatchlistEntryInputSchema;
};

export const deleteWatchlistEntryHandler = async ({ ctx, input }: DeleteWatchlistEntryOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to manage blocklist",
    });
  }

  const watchlistRepo = new WatchlistRepository(prisma);
  const { entry } = await watchlistRepo.findEntryWithAuditAndReports(input.id);

  if (!entry) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Blocklist entry not found",
    });
  }

  if (entry.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only delete blocklist entries from your organization",
    });
  }

  const service = getOrganizationWatchlistOperationsService(organizationId);

  try {
    return await service.deleteWatchlistEntry({
      entryId: input.id,
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
        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
      }
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete blocklist entry",
    });
  }
};
