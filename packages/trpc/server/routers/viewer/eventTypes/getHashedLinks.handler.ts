import { HashedLinkRepository } from "@calcom/features/hashedLink/lib/repository/HashedLinkRepository";
import { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TGetHashedLinksInputSchema } from "./getHashedLinks.schema";

type GetHashedLinksOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetHashedLinksInputSchema;
};

export const getHashedLinksHandler = async ({ ctx, input }: GetHashedLinksOptions) => {
  const { linkIds } = input;

  if (!linkIds.length) {
    return [];
  }

  // Get all hashed links with usage data
  const privateLinksRepo = HashedLinkRepository.create();
  const hashedLinks = await privateLinksRepo.findLinksWithEventTypeDetails(linkIds);

  // Check if the user has permission to access these hashed links
  const privateLinkService = new HashedLinkService();
  const validLinks = await Promise.all(
    hashedLinks.map(async (link) => {
      const hasPermission = await privateLinkService.checkUserPermissionForLink(link, ctx.user.id);

      if (!hasPermission) {
        return null;
      }

      return {
        id: link.id,
        linkId: link.link,
        expiresAt: link.expiresAt,
        maxUsageCount: link.maxUsageCount,
        usageCount: link.usageCount,
      };
    })
  );

  // Filter out null values (unauthorized links)
  return validLinks.filter((link): link is NonNullable<typeof link> => link !== null);
};
