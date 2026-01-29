import { getFeatureOptInService } from "@calcom/features/di/containers/FeatureOptInService";
import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import { getUserFeatureRepository } from "@calcom/features/di/containers/UserFeatureRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { isOptInFeature } from "@calcom/features/feature-opt-in/config";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { ZodEnum } from "zod";
import { z } from "zod";
import authedProcedure from "../../../procedures/authedProcedure";
import { createOrgPbacProcedure, createTeamPbacProcedure } from "../../../procedures/pbacProcedures";
import { router } from "../../../trpc";

const featureStateSchema: ZodEnum<["enabled", "disabled", "inherit"]> = z.enum([
  "enabled",
  "disabled",
  "inherit",
]);

const featureOptInService: ReturnType<typeof getFeatureOptInService> = getFeatureOptInService();
const teamFeatureRepository: ReturnType<typeof getTeamFeatureRepository> = getTeamFeatureRepository();
const userFeatureRepository: ReturnType<typeof getUserFeatureRepository> = getUserFeatureRepository();
const teamRepository: TeamRepository = new TeamRepository(prisma);

export const featureOptInRouter = router({
  /**
   * Get all opt-in features with states for current user.
   * This considers all teams/orgs the user belongs to.
   */
  listForUser: authedProcedure.query(async ({ ctx }) => {
    return featureOptInService.listFeaturesForUser({
      userId: ctx.user.id,
    });
  }),

  /**
   * Get all opt-in features with states for a team settings page.
   * Used by team admins to configure feature opt-in for their team.
   * Also returns the organization state if the team belongs to an organization.
   */
  listForTeam: createTeamPbacProcedure("featureOptIn.read").query(async ({ input }) => {
    // Get the team's parent organization ID (if any)
    const parentOrg = await teamRepository.findParentOrganizationByTeamId(input.teamId);
    const parentOrgId = parentOrg?.id ?? null;

    return featureOptInService.listFeaturesForTeam({ teamId: input.teamId, parentOrgId, scope: "team" });
  }),

  /**
   * Get all opt-in features with states for organization settings page.
   * Used by org admins to configure feature opt-in for their organization.
   */
  listForOrganization: createOrgPbacProcedure("featureOptIn.read").query(async ({ ctx }) => {
    // Organizations use the same listFeaturesForTeam since they're stored in TeamFeatures
    // Pass scope: "org" to filter features that are scoped to organizations
    return featureOptInService.listFeaturesForTeam({ teamId: ctx.organizationId, scope: "org" });
  }),

  checkFeatureOptInEligibility: authedProcedure
    .input(
      z.object({
        featureId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return featureOptInService.checkFeatureOptInEligibility({
        userId: ctx.user.id,
        featureId: input.featureId,
      });
    }),

  /**
   * Set user's feature state.
   */
  setUserState: authedProcedure
    .input(
      z.object({
        slug: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOptInFeature(input.slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid slug. This feature is not opt-in configurable.",
        });
      }

      await featureOptInService.setUserFeatureState({
        userId: ctx.user.id,
        featureId: input.slug,
        state: input.state,
        assignedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Set team's feature state (requires team admin).
   */
  setTeamState: createTeamPbacProcedure("featureOptIn.update")
    .input(
      z.object({
        slug: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOptInFeature(input.slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid slug. This feature is not opt-in configurable.",
        });
      }

      await featureOptInService.setTeamFeatureState({
        teamId: input.teamId,
        featureId: input.slug,
        state: input.state,
        assignedBy: ctx.user.id,
        scope: "team",
      });

      return { success: true };
    }),

  /**
   * Set organization's feature state (requires org admin).
   */
  setOrganizationState: createOrgPbacProcedure("featureOptIn.update")
    .input(
      z.object({
        slug: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOptInFeature(input.slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid slug. This feature is not opt-in configurable.",
        });
      }

      // Organizations use the same TeamFeatures table
      await featureOptInService.setTeamFeatureState({
        teamId: ctx.organizationId,
        featureId: input.slug,
        state: input.state,
        assignedBy: ctx.user.id,
        scope: "org",
      });

      return { success: true };
    }),

  /**
   * Get user's auto opt-in preference.
   */
  getUserAutoOptIn: authedProcedure.query(async ({ ctx }) => {
    const autoOptIn = await userFeatureRepository.findAutoOptInByUserId(ctx.user.id);
    return { autoOptIn };
  }),

  /**
   * Set user's auto opt-in preference.
   */
  setUserAutoOptIn: authedProcedure
    .input(
      z.object({
        autoOptIn: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await userFeatureRepository.setAutoOptIn(ctx.user.id, input.autoOptIn);
      return { success: true };
    }),

  /**
   * Get team's auto opt-in preference (requires team admin).
   */
  getTeamAutoOptIn: createTeamPbacProcedure("featureOptIn.read").query(async ({ input }) => {
    const result = await teamFeatureRepository.findAutoOptInByTeamIds([input.teamId]);
    return { autoOptIn: result[input.teamId] ?? false };
  }),

  /**
   * Set team's auto opt-in preference (requires team admin).
   */
  setTeamAutoOptIn: createTeamPbacProcedure("featureOptIn.update")
    .input(
      z.object({
        autoOptIn: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await teamFeatureRepository.setAutoOptIn(input.teamId, input.autoOptIn);
      return { success: true };
    }),

  /**
   * Get organization's auto opt-in preference (requires org admin).
   */
  getOrganizationAutoOptIn: createOrgPbacProcedure("featureOptIn.read").query(async ({ ctx }) => {
    const result = await teamFeatureRepository.findAutoOptInByTeamIds([ctx.organizationId]);
    return { autoOptIn: result[ctx.organizationId] ?? false };
  }),

  /**
   * Set organization's auto opt-in preference (requires org admin).
   */
  setOrganizationAutoOptIn: createOrgPbacProcedure("featureOptIn.update")
    .input(
      z.object({
        autoOptIn: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await teamFeatureRepository.setAutoOptIn(ctx.organizationId, input.autoOptIn);
      return { success: true };
    }),
});
