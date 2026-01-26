import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import type { AppFlags, FeatureId } from "@calcom/features/flags/config";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";

/**
 * TRPC procedure that returns a map of all feature flags and their enabled status.
 * Uses the FeaturesRepository to handle caching and database access.
 */
export const map = publicProcedure.query(async () => {
  const featureRepository = getFeatureRepository();
  const flags = await featureRepository.findAll();
  return flags.reduce((acc, flag) => {
    acc[flag.slug as FeatureId] = flag.enabled;
    return acc;
  }, {} as AppFlags);
});
