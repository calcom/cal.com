import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetWatchlistEntryDetailsInputSchema } from "./getWatchlistEntryDetails.schema";

type GetWatchlistEntryDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetWatchlistEntryDetailsInputSchema;
};

export const getWatchlistEntryDetailsHandler = async ({ ctx, input }: GetWatchlistEntryDetailsOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to view blocklist",
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

  const result = await watchlistRepo.findEntryWithAuditAndReports(input.id);

  if (!result.entry) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Blocklist entry not found",
    });
  }

  if (result.entry.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only view blocklist entries from your organization",
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
