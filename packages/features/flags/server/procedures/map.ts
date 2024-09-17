import { FeatureFlagRepository } from "@calcom/lib/server/repository/featureFlag";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";

export const map = publicProcedure.query(async () => {
  return await FeatureFlagRepository.getFeatureFlagMap();
});
