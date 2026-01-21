import { HashedLinkRepository } from "@calcom/features/hashedLink/lib/repository/HashedLinkRepository";
import { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

type GetHashedLinkOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: {
    linkId: string;
  };
};

export const getHashedLinkHandler = async ({ ctx, input }: GetHashedLinkOptions) => {
  const { linkId } = input;

  if (!linkId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Missing link ID",
    });
  }

  const hashedLinkRepository = HashedLinkRepository.create();
  // Get the hashed link with usage data
  const hashedLink = await hashedLinkRepository.findLinkWithEventTypeDetails(linkId);

  if (!hashedLink) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Hashed link not found",
    });
  }

  // Check if the user has permission to access this hashed link
  const hashedLinkService = new HashedLinkService();
  const hasPermission = await hashedLinkService.checkUserPermissionForLink(hashedLink, ctx.user.id);

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to access this link",
    });
  }

  return {
    id: hashedLink.id,
    link: hashedLink.link,
    expiresAt: hashedLink.expiresAt,
    maxUsageCount: hashedLink.maxUsageCount,
    usageCount: hashedLink.usageCount,
  };
};
