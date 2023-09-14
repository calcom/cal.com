import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type IsKYCVerifiedOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const isVerifiedHandler = async ({ ctx }: IsKYCVerifiedOptions) => {
  const user = ctx.user;

  const memberships = await prisma.membership.findMany({
    where: {
      accepted: true,
      userId: user.id,
      team: {
        slug: {
          not: null,
        },
      },
    },
    select: {
      team: {
        select: {
          metadata: true,
        },
      },
    },
  });

  let isKYCVerified = user && hasKeyInMetadata(user, "kycVerified") ? !!user.metadata.kycVerified : false;

  if (!isKYCVerified) {
    //check if user is part of a team that is KYC verified
    isKYCVerified = !!memberships.find(
      (membership) =>
        hasKeyInMetadata(membership.team, "kycVerified") && !!membership.team.metadata.kycVerified
    );
  }

  return { isKYCVerified };
};
