import { HashedLinksRepository } from "@calcom/lib/server/repository/hashedLinks.repository";
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

  const privateLinksRepo = new HashedLinksRepository(ctx.prisma);
  // Get the hashed link with usage data
  const hashedLink = await privateLinksRepo.findLinkWithEventTypeDetails(linkId);

  if (!hashedLink) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Hashed link not found",
    });
  }

  // Check if the user has permission to access this hashed link
  const hasPermission = await privateLinksRepo.checkUserPermissionForLink(hashedLink, ctx.user.id);

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
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
