import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { FeaturesRepository } from "../features.repository";
import { map } from "./procedures/map";

export const featureFlagRouter = router({
  list: publicProcedure.query(async () => {
    const featuresRepository = new FeaturesRepository();
    return featuresRepository.getAllFeatures();
  }),
  map,
});
