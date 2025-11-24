import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

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

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: organizationId,
    permission: "watchlist.delete",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to delete blocklist entries",
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

  try {
    await watchlistRepo.deleteEntry(input.id, user.id);

    return {
      success: true,
      message: "Blocklist entry deleted successfully",
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete blocklist entry",
    });
  }
};

export default deleteWatchlistEntryHandler;
