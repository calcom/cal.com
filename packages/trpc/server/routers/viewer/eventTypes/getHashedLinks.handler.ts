import { prisma } from "@calcom/prisma";
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
  const hashedLinks = await prisma.hashedLink.findMany({
    where: {
      link: {
        in: linkIds,
      },
    },
    select: {
      id: true,
      link: true,
      expiresAt: true,
      maxUsageCount: true,
      usageCount: true,
      eventTypeId: true,
      eventType: {
        select: {
          teamId: true,
          userId: true,
        },
      },
    },
  });

  // Check if the user has permission to access these hashed links
  const userId = ctx.user.id;
  const validLinks = await Promise.all(
    hashedLinks.map(async (link) => {
      // If the event type belongs to a user, check if it's the current user
      if (link.eventType.userId && link.eventType.userId !== userId) {
        return null;
      }

      // If the event type belongs to a team, check if the user is part of that team
      if (link.eventType.teamId) {
        const membership = await prisma.membership.findFirst({
          where: {
            teamId: link.eventType.teamId,
            userId,
            accepted: true,
          },
          select: {
            id: true,
          },
        });

        if (!membership) {
          return null;
        }
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
