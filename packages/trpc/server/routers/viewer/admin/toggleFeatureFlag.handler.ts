import type { PrismaClient } from "@calcom/prisma";

import type { TAdminToggleFeatureFlagSchema } from "./toggleFeatureFlag.schema";

type GetOptions = {
  ctx: {
    user: { id: number };
    prisma: PrismaClient;
  };
  input: TAdminToggleFeatureFlagSchema;
};

export const toggleFeatureFlagHandler = async (opts: GetOptions) => {
  const { ctx, input } = opts;
  const { prisma, user } = ctx;
  const { slug, enabled } = input;
  return prisma.feature.update({
    where: { slug },
    data: { enabled, updatedBy: user.id },
  });
};

export default toggleFeatureFlagHandler;
