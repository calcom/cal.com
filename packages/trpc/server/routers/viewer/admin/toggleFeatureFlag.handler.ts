import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminToggleFeatureFlagSchema } from "./toggleFeatureFlag.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TAdminToggleFeatureFlagSchema;
};

export const toggleFeatureFlagHandler = async (opts: GetOptions) => {
  const { ctx, input } = opts;
  const { prisma, user } = ctx;
  const { slug, enabled } = input;
  await handleFeatureToggle(opts);
  return prisma.feature.update({
    where: { slug },
    data: { enabled, updatedBy: user.id },
  });
};

export default toggleFeatureFlagHandler;

async function handleFeatureToggle({ ctx, input }: GetOptions) {
  const { prisma } = ctx;
  const { slug, enabled } = input;
  // If we're disabling the calendar cache, clear it
  if (slug === "calendar-cache" && enabled === false) {
    logger.info("Clearing calendar cache");
    await prisma.calendarCache.deleteMany();
  }
}
