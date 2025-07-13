import { z } from "zod";

import type { AppFlags } from "@calcom/features/flags/config";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { CachedFeaturesRepository } from "../features.repository.cached";
import { map } from "./procedures/map";

export const featureFlagRouter = router({
  list: publicProcedure.query(async () => {
    const featuresRepository = new CachedFeaturesRepository();
    return featuresRepository.getAllFeatures();
  }),
  checkTeamFeature: publicProcedure
    .input(
      z.object({
        teamId: z.number(),
        feature: z.string(),
      })
    )
    .query(async ({ input }) => {
      const featuresRepository = new CachedFeaturesRepository();
      return featuresRepository.checkIfTeamHasFeature(input.teamId, input.feature as keyof AppFlags);
    }),
  map,
});
