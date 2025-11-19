import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import prisma from "@calcom/prisma";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";

/**
 * TRPC procedure that returns a map of all feature flags and their enabled status.
 * Uses the FeaturesRepository to handle caching and database access.
 */
export const map = publicProcedure.query(async () => {
  const featuresRepository = new FeaturesRepository(prisma);
  return featuresRepository.getFeatureFlagMap();
});
