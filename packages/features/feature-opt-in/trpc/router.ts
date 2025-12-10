import { z } from "zod";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { PrismaClient } from "@calcom/prisma";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { FeatureOptInRepository } from "../repositories/FeatureOptInRepository";
import { FeatureAccessService } from "../services/FeatureAccessService";
import type { FeatureState } from "../types";

const featureStateSchema = z.enum(["enabled", "disabled", "inherit"]) satisfies z.ZodType<FeatureState>;

const getFeatureAccessService = (prisma: PrismaClient) => {
  const featuresRepository = new FeaturesRepository(prisma);
  const featureOptInRepository = new FeatureOptInRepository(prisma);
  return new FeatureAccessService(featuresRepository, featureOptInRepository);
};

const getFeatureOptInRepository = (prisma: PrismaClient) => {
  return new FeatureOptInRepository(prisma);
};

export const featureOptInRouter = router({
  /**
   * List all features for the current user with their enabled status.
   */
  listForUser: authedProcedure.query(async ({ ctx }) => {
    const service = getFeatureAccessService(ctx.prisma);
    return service.listFeaturesForUser(ctx.user.id);
  }),

  /**
   * List all features for a team with their enabled status.
   */
  listForTeam: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = getFeatureAccessService(ctx.prisma);
      return service.listFeaturesForTeam(input.teamId);
    }),

  /**
   * List all features for an organization with their enabled status.
   */
  listForOrganization: authedProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = getFeatureAccessService(ctx.prisma);
      return service.listFeaturesForOrganization(input.organizationId);
    }),

  /**
   * Set the state of a feature for the current user.
   * Users can always control their own features - no PBAC check needed.
   * State can be "enabled", "disabled", or "inherit" (inherit from team/org level).
   */
  setUserFeatureEnabled: authedProcedure
    .input(
      z.object({
        featureSlug: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = getFeatureAccessService(ctx.prisma);
      await service.setUserFeatureEnabled(ctx.user.id, input.featureSlug, input.state, `user:${ctx.user.id}`);
      return { success: true };
    }),

  /**
   * Set the state of a feature for a team.
   * Requires appropriate PBAC permissions.
   * State can be "enabled", "disabled" (blocks for users), or "inherit" (inherit from org level).
   */
  setTeamFeatureEnabled: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        featureSlug: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = getFeatureAccessService(ctx.prisma);
      await service.setTeamFeatureEnabled(
        input.teamId,
        input.featureSlug,
        input.state,
        `user:${ctx.user.id}`
      );
      return { success: true };
    }),

  /**
   * Set the state of a feature for an organization.
   * Requires appropriate PBAC permissions.
   * State can be "enabled", "disabled" (blocks for teams/users), or "inherit".
   */
  setOrganizationFeatureEnabled: authedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        featureSlug: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = getFeatureAccessService(ctx.prisma);
      await service.setOrganizationFeatureEnabled(
        input.organizationId,
        input.featureSlug,
        input.state,
        `user:${ctx.user.id}`
      );
      return { success: true };
    }),

  /**
   * Get features that are eligible for opt-in via the banner system.
   */
  getEligibleOptInFeatures: authedProcedure.query(async ({ ctx }) => {
    const service = getFeatureAccessService(ctx.prisma);
    return service.getEligibleOptInFeatures(ctx.user.id);
  }),

  /**
   * Check if a user has opted into a specific feature.
   */
  hasUserOptedIn: authedProcedure
    .input(
      z.object({
        featureSlug: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = getFeatureAccessService(ctx.prisma);
      return service.hasUserOptedIn(ctx.user.id, input.featureSlug);
    }),

  /**
   * Opt into a feature via the banner system.
   * This is a convenience endpoint that enables the feature for the current user.
   */
  optInToFeature: authedProcedure
    .input(
      z.object({
        featureSlug: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = getFeatureAccessService(ctx.prisma);

      if (!service.isFeatureInOptInAllowlist(input.featureSlug)) {
        throw new Error("Feature is not available for opt-in");
      }

      await service.setUserFeatureEnabled(ctx.user.id, input.featureSlug, "enabled", `user:${ctx.user.id}`);
      return { success: true };
    }),

  /**
   * Get the auto opt-in preference for the current user.
   */
  getUserAutoOptInPreference: authedProcedure.query(async ({ ctx }) => {
    const featureOptInRepository = getFeatureOptInRepository(ctx.prisma);
    const autoOptInExperimentalFeatures = await featureOptInRepository.getUserAutoOptInPreference(
      ctx.user.id
    );
    return { autoOptInExperimentalFeatures };
  }),

  /**
   * Set the auto opt-in preference for the current user.
   */
  setUserAutoOptInPreference: authedProcedure
    .input(
      z.object({
        autoOptInExperimentalFeatures: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const featureOptInRepository = getFeatureOptInRepository(ctx.prisma);
      await featureOptInRepository.setUserAutoOptInPreference(
        ctx.user.id,
        input.autoOptInExperimentalFeatures
      );
      return { success: true };
    }),

  /**
   * Get the auto opt-in preference for a team.
   */
  getTeamAutoOptInPreference: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const featureOptInRepository = getFeatureOptInRepository(ctx.prisma);
      const autoOptInExperimentalFeatures = await featureOptInRepository.getTeamAutoOptInPreference(
        input.teamId
      );
      return { autoOptInExperimentalFeatures };
    }),

  /**
   * Set the auto opt-in preference for a team.
   */
  setTeamAutoOptInPreference: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        autoOptInExperimentalFeatures: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const featureOptInRepository = getFeatureOptInRepository(ctx.prisma);
      await featureOptInRepository.setTeamAutoOptInPreference(
        input.teamId,
        input.autoOptInExperimentalFeatures
      );
      return { success: true };
    }),
});
