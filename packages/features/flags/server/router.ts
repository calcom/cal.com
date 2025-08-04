import { z } from "zod";

import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { map } from "./procedures/map";

export const featureFlagRouter = router({
  list: publicProcedure.query(async () => {
    const featuresRepository = new FeaturesRepository(prisma);
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
      const featuresRepository = new FeaturesRepository(prisma);
      return featuresRepository.checkIfTeamHasFeature(input.teamId, input.feature as keyof AppFlags);
    }),
  map,
});
