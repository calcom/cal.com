import { TRPCError } from "@trpc/server";

import { prisma } from "@calcom/prisma";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type DeleteFaviconOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

/**
 * Handler for deleting a user's custom favicon.
 * Removes the favicon from Avatar table (teamId=-1, isBanner=true)
 * and clears the favicon reference from user metadata.
 */
export const deleteFaviconHandler = async ({ ctx }: DeleteFaviconOptions) => {
  const { user } = ctx;

  try {
    // Delete favicon from Avatar table
    await prisma.avatar.deleteMany({
      where: {
        teamId: -1, // Special marker for user branding assets
        userId: user.id,
        isBanner: true, // true = favicon
      },
    });

    // Remove favicon from user metadata
    const currentMetadata = userMetadataSchema.parse(user.metadata);
    const { favicon: _favicon, ...restMetadata } = currentMetadata || {};

    await prisma.user.update({
      where: { id: user.id },
      data: { metadata: restMetadata },
    });

    return {
      success: true,
      message: "Favicon deleted successfully",
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete favicon. Please try again.",
      cause: error,
    });
  }
};

