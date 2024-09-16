import { FeatureFlagRepository } from "@calcom/lib/server/repository/featureFlag";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

export const featureFlagRouter = router({
  list: publicProcedure.query(async () => {
    return await FeatureFlagRepository.getFeatureFlags();
  }),
  map: publicProcedure.query(async () => {
    return await FeatureFlagRepository.getFeatureFlagMap();
  }),
});
