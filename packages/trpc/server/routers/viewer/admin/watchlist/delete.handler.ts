import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";

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

  const watchlistRepo = new WatchlistRepository(prisma);

  const { entry } = await watchlistRepo.findEntryWithAuditAndReports(input.id);

  if (!entry) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Blocklist entry not found",
    });
  }

  if (!entry.isGlobal || entry.organizationId !== null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only delete system blocklist entries",
    });
  }

  try {
    await watchlistRepo.deleteEntry(input.id, user.id);

    return {
      success: true,
      message: "System blocklist entry deleted successfully",
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete system blocklist entry",
    });
  }
};

export default deleteWatchlistEntryHandler;
