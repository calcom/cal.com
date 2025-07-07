import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

type GetHashedLinkOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
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

  // Get the hashed link with usage data
  const hashedLink = await prisma.hashedLink.findUnique({
    where: {
      link: linkId,
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

  if (!hashedLink) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Hashed link not found",
    });
  }

  // Check if the user has permission to access this hashed link
  const userId = ctx.user.id;
  const eventTypeTeamId = hashedLink.eventType.teamId;
  const eventTypeUserId = hashedLink.eventType.userId;

  // If the event type belongs to a user, check if it's the current user
  if (eventTypeUserId && eventTypeUserId !== userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You don't have permission to access this link",
    });
  }

  // If the event type belongs to a team, check if the user is part of that team
  if (eventTypeTeamId) {
    const membership = await prisma.membership.findFirst({
      where: {
        teamId: eventTypeTeamId,
        userId,
        accepted: true,
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to access this link",
      });
    }
  }

  return {
    id: hashedLink.id,
    link: hashedLink.link,
    expiresAt: hashedLink.expiresAt,
    maxUsageCount: hashedLink.maxUsageCount,
    usageCount: hashedLink.usageCount,
  };
};
