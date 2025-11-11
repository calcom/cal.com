import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";

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
  const watchlistRepo = new WatchlistRepository(prisma);

  const entries = await watchlistRepo.findEntriesByIds(input.ids);

  const entryMap = new Map(entries.map((e) => [e.id, e]));
  const validIds: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  for (const id of input.ids) {
    const entry = entryMap.get(id);

    if (!entry) {
      failed.push({ id, reason: "Entry not found" });
      continue;
    }

    if (!entry.isGlobal || entry.organizationId !== null) {
      failed.push({ id, reason: "Can only delete system blocklist entries" });
      continue;
    }

    validIds.push(id);
  }

  let successCount = 0;
  if (validIds.length > 0) {
    const result = await watchlistRepo.bulkDeleteEntries({
      ids: validIds,
      userId: user.id,
    });
    successCount = result.deleted;
  }

  if (successCount === 0 && failed.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Failed to delete all entries: ${failed[0].reason}`,
    });
  }

  return {
    success: successCount,
    failed: failed.length,
    message:
      failed.length === 0
        ? "All entries deleted successfully"
        : `Deleted ${successCount} entries, ${failed.length} failed`,
  };
};

export default bulkDeleteWatchlistEntriesHandler;
