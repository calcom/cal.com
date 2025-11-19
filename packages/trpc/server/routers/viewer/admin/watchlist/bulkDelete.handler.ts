import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TBulkDeleteWatchlistEntriesInputSchema } from "./bulkDelete.schema";

type BulkDeleteWatchlistEntriesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkDeleteWatchlistEntriesInputSchema;
};

export const bulkDeleteWatchlistEntriesHandler = async ({
  ctx,
  input,
}: BulkDeleteWatchlistEntriesOptions) => {
  const { user } = ctx;
  const service = getAdminWatchlistOperationsService();

  try {
    return await service.bulkDeleteWatchlistEntries({
      ids: input.ids,
      userId: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";

    if (message.includes("Failed to delete all entries")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete system blocklist entries",
    });
  }
};

export default bulkDeleteWatchlistEntriesHandler;
