import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TListWatchlistEntriesInputSchema } from "./listWatchlistEntries.schema";

type ListWatchlistEntriesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListWatchlistEntriesInputSchema;
};

export const listWatchlistEntriesHandler = async ({ ctx, input }: ListWatchlistEntriesOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to manage blocklist",
    });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: organizationId,
    permission: "watchlist.read",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to view blocklist entries",
    });
  }

  const watchlistRepo = new WatchlistRepository(prisma);
  const userRepo = new UserRepository(prisma);

  const result = await watchlistRepo.findAllEntries({
    organizationId,
    limit: input.limit,
    offset: input.offset,
    searchTerm: input.searchTerm,
    filters: input.filters,
  });

  const userIds = result.rows
    .map((entry) => entry.audits?.[0]?.changedByUserId)
    .filter((id): id is number => id !== null && id !== undefined);

  const uniqueUserIds = Array.from(new Set(userIds));

  const users = uniqueUserIds.length > 0 ? await userRepo.findUsersByIds(uniqueUserIds) : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const rowsWithCreators = result.rows.map((entry) => {
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
    meta: result.meta,
  };
};

export default listWatchlistEntriesHandler;
