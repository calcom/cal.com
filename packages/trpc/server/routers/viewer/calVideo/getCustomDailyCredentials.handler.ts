import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type GetCustomDailyCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getCustomDailyCredentialsHandler = async ({ ctx }: GetCustomDailyCredentialsOptions) => {
  const { user } = ctx;

  if (!user.organizationId) {
    return { hasCustomCredentials: false, apiKey: null };
  }

  const credential = await prisma.credential.findFirst({
    where: {
      teamId: user.organizationId,
      type: "daily_video",
      appId: "daily-video",
    },
    select: {
      id: true,
      key: true,
    },
  });

  if (!credential) {
    return { hasCustomCredentials: false, apiKey: null };
  }

  const key = credential.key as { api_key?: string } | null;
  const apiKey = key?.api_key;

  if (!apiKey) {
    return { hasCustomCredentials: false, apiKey: null };
  }

  const maskedApiKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "****";

  return {
    hasCustomCredentials: true,
    apiKey: maskedApiKey,
  };
};
