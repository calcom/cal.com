import { z } from "zod";

import { isOptInFeature } from "@calcom/features/feature-opt-in/config";
import { FeatureOptInService } from "@calcom/features/feature-opt-in/services/FeatureOptInService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { createOrgPbacProcedure, createTeamPbacProcedure } from "./util";

const featureStateSchema = z.enum(["enabled", "disabled", "inherit"]);

const featuresRepository = new FeaturesRepository(prisma);
const featureOptInService = new FeatureOptInService(featuresRepository);

/**
 * Helper to get user's org and team IDs from their memberships.
 * Returns orgId (if user belongs to an org) and teamIds (non-org teams).
 */
async function getUserOrgAndTeamIds(userId: number): Promise<{ orgId: number | null; teamIds: number[] }> {
  const memberships = await MembershipRepository.findAllByUserId({
    userId,
    filters: { accepted: true },
  });

  let orgId: number | null = null;
  const teamIds: number[] = [];

  for (const membership of memberships) {
    if (membership.team.isOrganization) {
      orgId = membership.teamId;
    } else {
      teamIds.push(membership.teamId);
    }
  }

  return { orgId, teamIds };
}

export const featureOptInRouter = router({
  /**
   * Get all opt-in features with states for current user.
   * This considers all teams/orgs the user belongs to.
   */
  listForUser: authedProcedure.query(async ({ ctx }) => {
    const { orgId, teamIds } = await getUserOrgAndTeamIds(ctx.user.id);

    return featureOptInService.listFeaturesForUser({
      userId: ctx.user.id,
      orgId,
      teamIds,
    });
  }),

  /**
   * Get all opt-in features with states for a team settings page.
   * Used by team admins to configure feature opt-in for their team.
   */
  listForTeam: createTeamPbacProcedure("team.read").query(async ({ input }) => {
    return featureOptInService.listFeaturesForTeam({ teamId: input.teamId });
  }),

  /**
   * Get all opt-in features with states for organization settings page.
   * Used by org admins to configure feature opt-in for their organization.
   */
  listForOrganization: createOrgPbacProcedure("organization.read").query(async ({ ctx }) => {
    // Organizations use the same listFeaturesForTeam since they're stored in TeamFeatures
    return featureOptInService.listFeaturesForTeam({ teamId: ctx.organizationId });
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
  setTeamState: createTeamPbacProcedure("team.update")
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
      });

      return { success: true };
    }),

  /**
   * Set organization's feature state (requires org admin).
   */
  setOrganizationState: createOrgPbacProcedure("organization.update")
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
      });

      return { success: true };
    }),

  /**
   * Get user's auto opt-in preference.
   */
  getUserAutoOptIn: authedProcedure.query(async ({ ctx }) => {
    const autoOptIn = await featuresRepository.getUserAutoOptIn(ctx.user.id);
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
      await featuresRepository.setUserAutoOptIn(ctx.user.id, input.autoOptIn);
      return { success: true };
    }),

  /**
   * Get team's auto opt-in preference (requires team admin).
   */
  getTeamAutoOptIn: createTeamPbacProcedure("team.read").query(async ({ input }) => {
    const autoOptIn = await featuresRepository.getTeamAutoOptIn(input.teamId);
    return { autoOptIn };
  }),

  /**
   * Set team's auto opt-in preference (requires team admin).
   */
  setTeamAutoOptIn: createTeamPbacProcedure("team.update")
    .input(
      z.object({
        autoOptIn: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await featuresRepository.setTeamAutoOptIn(input.teamId, input.autoOptIn);
      return { success: true };
    }),

  /**
   * Get organization's auto opt-in preference (requires org admin).
   */
  getOrganizationAutoOptIn: createOrgPbacProcedure("organization.read").query(async ({ ctx }) => {
    const autoOptIn = await featuresRepository.getTeamAutoOptIn(ctx.organizationId);
    return { autoOptIn };
  }),

  /**
   * Set organization's auto opt-in preference (requires org admin).
   */
  setOrganizationAutoOptIn: createOrgPbacProcedure("organization.update")
    .input(
      z.object({
        autoOptIn: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await featuresRepository.setTeamAutoOptIn(ctx.organizationId, input.autoOptIn);
      return { success: true };
    }),
});
