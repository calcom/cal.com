import { TRPCError } from "@trpc/server";

import { prisma } from "@calcom/prisma";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type DeleteLogoOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

/**
 * Handler for deleting a user's business logo.
 * Removes the logo from Avatar table (teamId=-1, isBanner=false)
 * and clears the businessLogo reference from user metadata.
 */
export const deleteLogoHandler = async ({ ctx }: DeleteLogoOptions) => {
  const { user } = ctx;

  try {
    // Delete logo from Avatar table
    await prisma.avatar.deleteMany({
      where: {
        teamId: -1, // Special marker for user branding assets
        userId: user.id,
        isBanner: false, // false = logo
      },
    });

    // Remove businessLogo from user metadata
    const currentMetadata = userMetadataSchema.parse(user.metadata);
    const { businessLogo: _businessLogo, ...restMetadata } = currentMetadata || {};

    await prisma.user.update({
      where: { id: user.id },
      data: { metadata: restMetadata },
    });

    return {
      success: true,
      message: "Logo deleted successfully",
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete logo. Please try again.",
      cause: error,
    });
  }
};

