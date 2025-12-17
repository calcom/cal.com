import { z } from "zod";

import { isOptInFeature } from "@calcom/features/feature-opt-in/config";
import { FeatureOptInService } from "@calcom/features/feature-opt-in/services/FeatureOptInService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

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
  listForTeam: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: input.teamId,
        permission: "team.read",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view team feature settings.",
        });
      }

      return featureOptInService.listFeaturesForTeam({ teamId: input.teamId });
    }),

  /**
   * Get all opt-in features with states for organization settings page.
   * Used by org admins to configure feature opt-in for their organization.
   * Uses the organization from the current user's context.
   */
  listForOrganization: authedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.user.organizationId;

    if (!organizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are not a member of any organization.",
      });
    }

    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: organizationId,
      permission: "organization.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view organization feature settings.",
      });
    }

    // Organizations use the same listFeaturesForTeam since they're stored in TeamFeatures
    return featureOptInService.listFeaturesForTeam({ teamId: organizationId });
  }),

  /**
   * Set user's feature state.
   */
  setUserState: authedProcedure
    .input(
      z.object({
        featureId: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOptInFeature(input.featureId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid featureId. This feature is not opt-in configurable.",
        });
      }

      await featureOptInService.setUserFeatureState({
        userId: ctx.user.id,
        featureId: input.featureId,
        state: input.state,
        assignedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Set team's feature state (requires team admin).
   */
  setTeamState: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        featureId: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOptInFeature(input.featureId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid featureId. This feature is not opt-in configurable.",
        });
      }

      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: input.teamId,
        permission: "team.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update team feature settings.",
        });
      }

      await featureOptInService.setTeamFeatureState({
        teamId: input.teamId,
        featureId: input.featureId,
        state: input.state,
        assignedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Set organization's feature state (requires org admin).
   * Uses the organization from the current user's context.
   */
  setOrganizationState: authedProcedure
    .input(
      z.object({
        featureId: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOptInFeature(input.featureId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid featureId. This feature is not opt-in configurable.",
        });
      }

      const organizationId = ctx.user.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not a member of any organization.",
        });
      }

      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: organizationId,
        permission: "organization.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update organization feature settings.",
        });
      }

      // Organizations use the same TeamFeatures table
      await featureOptInService.setTeamFeatureState({
        teamId: organizationId,
        featureId: input.featureId,
        state: input.state,
        assignedBy: ctx.user.id,
      });

      return { success: true };
    }),
});
