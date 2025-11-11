import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TGetWatchlistEntryDetailsInputSchema } from "./getDetails.schema";

type GetWatchlistEntryDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetWatchlistEntryDetailsInputSchema;
};

export const getWatchlistEntryDetailsHandler = async ({ input }: GetWatchlistEntryDetailsOptions) => {
  const watchlistRepo = new WatchlistRepository(prisma);
  const userRepo = new UserRepository(prisma);

  const result = await watchlistRepo.findEntryWithAuditAndReports(input.id);

  if (!result.entry) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Blocklist entry not found",
    });
  }

  if (!result.entry.isGlobal || result.entry.organizationId !== null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only view system blocklist entries",
    });
  }

  const userIds = result.auditHistory
    .map((audit) => audit.changedByUserId)
    .filter((id): id is number => id !== null && id !== undefined);

  const uniqueUserIds = Array.from(new Set(userIds));

  const users = uniqueUserIds.length > 0 ? await userRepo.findUsersByIds(uniqueUserIds) : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const auditHistoryWithUsers = result.auditHistory.map((audit) => ({
    ...audit,
    changedByUser: audit.changedByUserId ? userMap.get(audit.changedByUserId) : undefined,
  }));

  return {
    entry: result.entry,
    auditHistory: auditHistoryWithUsers,
  };
};

export default getWatchlistEntryDetailsHandler;
