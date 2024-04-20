import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type GlobalSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const globalSettingsHandler = async ({ ctx }: GlobalSettingsOptions) => {
  const { user } = ctx;
  const userProfile = user.profile;
  const profile = await ProfileRepository.findByUpId(userProfile.upId);

  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const globalSettings = await prisma.globalSettings.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      bookingLimits: true,
    },
  });

  return {
    globalSettings,
  };
};
