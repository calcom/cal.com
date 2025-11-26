import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { domainRegex, emailRegex } from "@calcom/lib/emailSchema";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";
import { MembershipRole, WatchlistAction } from "@calcom/prisma/enums";

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

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: organizationId,
    permission: "watchlist.create",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to create blocklist entries",
    });
  }

  const watchlistRepo = new WatchlistRepository(prisma);

  if (input.type === "EMAIL" && !emailRegex.test(input.value)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid email address format",
    });
  }

  if (input.type === "DOMAIN" && !domainRegex.test(input.value)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid domain format (e.g., example.com)",
    });
  }

  try {
    const entry = await watchlistRepo.createEntry({
      type: input.type,
      value: input.value.toLowerCase(),
      organizationId,
      action: WatchlistAction.BLOCK,
      description: input.description,
      userId: user.id,
    });

    return {
      success: true,
      entry,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This entry already exists in the blocklist for your organization",
      });
    }
    throw error;
  }
};

export default createWatchlistEntryHandler;
