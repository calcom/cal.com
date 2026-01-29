import prisma from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type PremiumOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const premiumHandler = async ({ ctx }: PremiumOptions) => {
  const { user: sessionUser } = ctx;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      metadata: true,
    },
  });

  const userMetadataParsed = userMetadata.parse(user.metadata);

  return {
    isPremium: userMetadataParsed?.isPremium ?? false,
  };
};

export default premiumHandler;
