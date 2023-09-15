import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TVerifyInputSchema } from "./verify.schema";

type VerifyOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TVerifyInputSchema;
};

export const verifyHandler = async ({ ctx, input }: VerifyOptions) => {
  const { name, isTeam } = input;
  if (isTeam) {
    const team = await prisma.team.findFirst({
      where: {
        slug: name,
      },
    });
    if (!team) {
      throw new Error("Team not found");
    }

    if (hasKeyInMetadata(team, "kycVerified") && !!team.metadata.kycVerified) {
      throw new Error("Team already verified");
    }

    const metadata = typeof team.metadata === "object" ? team.metadata : {};
    const updatedMetadata = { ...metadata, kycVerified: true };

    const updatedTeam = await prisma.team.update({
      where: {
        id: team.id,
      },
      data: {
        metadata: updatedMetadata,
      },
    });
    return {
      name: updatedTeam.slug,
      isTeam: true,
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      username: name,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (hasKeyInMetadata(user, "kycVerified") && !!user.metadata.kycVerified) {
    throw new Error("User already verified");
  }

  const metadata = typeof user.metadata === "object" ? user.metadata : {};
  const updatedMetadata = { ...metadata, kycVerified: true };

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      metadata: updatedMetadata,
    },
  });
  return {
    name: updatedUser.username,
    isTeam: false,
  };
};
