import { PrivateLinksRepository } from "@calcom/lib/server/repository/privateLinks";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetHashedLinksInputSchema } from "./getHashedLinks.schema";

type GetHashedLinksOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetHashedLinksInputSchema;
};

export const getHashedLinksHandler = async ({ ctx, input }: GetHashedLinksOptions) => {
  const { linkIds } = input;

  if (!linkIds.length) {
    return [];
  }

  // Get all hashed links with usage data
  const hashedLinks = await PrivateLinksRepository.findLinksWithEventTypeDetails(linkIds);

  // Check if the user has permission to access these hashed links
  const validLinks = await Promise.all(
    hashedLinks.map(async (link) => {
      const hasPermission = await PrivateLinksRepository.checkUserPermissionForLink(link, ctx.user.id);

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
