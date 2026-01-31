import { TRPCError } from "@trpc/server";

import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type RemoveCustomDailyCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const removeCustomDailyCredentialsHandler = async ({ ctx }: RemoveCustomDailyCredentialsOptions) => {
  const { user } = ctx;

  if (!user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature is only available for organizations",
    });
  }

  const credential = await prisma.credential.findFirst({
    where: {
      teamId: user.organizationId,
      type: "daily_video",
      appId: "daily-video",
    },
    select: {
      id: true,
    },
  });

  if (credential) {
    await prisma.credential.delete({
      where: {
        id: credential.id,
      },
    });
  }

  return { success: true };
};
