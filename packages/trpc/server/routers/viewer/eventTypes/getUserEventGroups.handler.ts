import { getUserEventGroupsData } from "@calcom/features/eventtypes/lib/getUserEventGroups";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TEventTypeInputSchema } from "./getByViewer.schema";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventTypeInputSchema;
};

export const getUserEventGroups = async ({ ctx, input }: GetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getUserProfiles:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const user = ctx.user;
  const userProfile = user.profile;

  const profile = await ProfileRepository.findByUpIdWithAuth(userProfile.upId, user.id);
  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  return await getUserEventGroupsData({
    userId: user.id,
    userUpId: userProfile.upId,
    filters: input?.filters,
  });
};

// Re-export the compareMembership function for backward compatibility
export { compareMembership } from "@calcom/features/eventtypes/lib/getEventTypesByViewer";
