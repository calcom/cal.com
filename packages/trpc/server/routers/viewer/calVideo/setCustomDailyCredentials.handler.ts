import { TRPCError } from "@trpc/server";

import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TSetCustomDailyCredentialsInputSchema } from "./setCustomDailyCredentials.schema";

type SetCustomDailyCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetCustomDailyCredentialsInputSchema;
};

export const setCustomDailyCredentialsHandler = async ({ ctx, input }: SetCustomDailyCredentialsOptions) => {
  const { user } = ctx;
  const { apiKey } = input;

  if (!user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature is only available for organizations",
    });
  }

  const existingCredential = await prisma.credential.findFirst({
    where: {
      teamId: user.organizationId,
      type: "daily_video",
      appId: "daily-video",
    },
    select: {
      id: true,
    },
  });

  if (existingCredential) {
    await prisma.credential.update({
      where: {
        id: existingCredential.id,
      },
      data: {
        key: {
          api_key: apiKey,
        },
      },
    });
  } else {
    await prisma.credential.create({
      data: {
        teamId: user.organizationId,
        type: "daily_video",
        appId: "daily-video",
        key: {
          api_key: apiKey,
        },
      },
    });
  }

  return { success: true };
};
