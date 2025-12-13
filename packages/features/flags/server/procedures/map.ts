import { getFeaturesRepository } from "@calcom/features/di/containers/RepositoryContainer";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";

/**
 * TRPC procedure that returns a map of all feature flags and their enabled status.
 * Uses the FeaturesRepository to handle caching and database access.
 */
export const map = publicProcedure.query(async () => {
  const featuresRepository = getFeaturesRepository();
  return featuresRepository.getFeatureFlagMap();
});
