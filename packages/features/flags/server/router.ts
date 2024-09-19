import { FeatureFlagRepository } from "@calcom/lib/server/repository/featureFlag";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { map } from "./procedures/map";

export const featureFlagRouter = router({
  list: publicProcedure.query(async () => {
    return await FeatureFlagRepository.getFeatureFlags();
  }),
  map,
});
