import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import type { AppFlags } from "@calcom/features/flags/config";
import { prisma } from "@calcom/prisma";
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";
import { z } from "zod";
import { map } from "./procedures/map";

export const featureFlagRouter = router({
  list: publicProcedure.query(async () => {
    const featuresRepository = getFeatureRepository();
    return featuresRepository.findAll();
  }),
  checkTeamFeature: publicProcedure
    .input(
      z.object({
        teamId: z.number(),
        feature: z.string(),
      })
    )
    .query(async ({ input }) => {
      const teamFeatureRepository = getTeamFeatureRepository();
      return teamFeatureRepository.checkIfTeamHasFeature(input.teamId, input.feature as keyof AppFlags);
    }),
  map,
});
