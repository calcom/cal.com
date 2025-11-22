import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TListWatchlistEntriesInputSchema } from "./list.schema";

type ListWatchlistEntriesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListWatchlistEntriesInputSchema;
};

export const listWatchlistEntriesHandler = async ({ input }: ListWatchlistEntriesOptions) => {
  const watchlistRepo = new WatchlistRepository(prisma);
  const userRepo = new UserRepository(prisma);

  const { rows, meta } = await watchlistRepo.findAllEntries({
    organizationId: null,
    isGlobal: true,
    limit: input.limit,
    offset: input.offset,
    searchTerm: input.searchTerm,
    filters: input.filters,
  });

  const userIds = rows
    .map((entry) => entry.audits?.[0]?.changedByUserId)
    .filter((id): id is number => id !== null && id !== undefined);

  const uniqueUserIds = Array.from(new Set(userIds));

  const users = uniqueUserIds.length > 0 ? await userRepo.findUsersByIds(uniqueUserIds) : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const rowsWithCreators = rows.map((entry) => {
    const audit = entry.audits?.[0];
    if (audit?.changedByUserId) {
      const changedByUser = userMap.get(audit.changedByUserId);
      return {
        ...entry,
        audits: [
          {
            ...audit,
            changedByUser,
          },
        ],
      };
    }
    return entry;
  });

  return {
    rows: rowsWithCreators,
    meta,
  };
};

export default listWatchlistEntriesHandler;
