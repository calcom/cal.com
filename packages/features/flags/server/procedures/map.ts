import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";

import { PrismaFeaturesRepository } from "../../features.repository";

/**
 * TRPC procedure that returns a map of all feature flags and their enabled status.
 * Uses the FeaturesRepository to handle caching and database access.
 */
export const map = publicProcedure.query(async () => {
  const featuresRepository = new PrismaFeaturesRepository();
  return featuresRepository.getFeatureFlagMap();
});
