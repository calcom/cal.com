import { z } from "zod";

import { FeatureOptInService } from "@calcom/features/feature-opt-in/FeatureOptInService";
import { PrismaFeatureOptInRepository } from "@calcom/features/feature-opt-in/PrismaFeatureOptInRepository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

const featureStateSchema = z.enum(["enabled", "disabled", "inherit"]);

function createFeatureOptInService() {
  const featureOptInRepository = new PrismaFeatureOptInRepository(prisma);
  const featuresRepository = new FeaturesRepository(prisma);
  return new FeatureOptInService(featureOptInRepository, featuresRepository);
}

export const featureOptInRouter = router({
  /**
   * Get all opt-in features with states for current user's settings page.
   */
  listForUser: authedProcedure.query(async ({ ctx }) => {
    const service = createFeatureOptInService();

    // Get user's primary team ID if they have one
    const membership = await MembershipRepository.findFirstAcceptedMembershipByUserId(ctx.user.id);

    return service.listFeaturesForUser({ userId: ctx.user.id, teamId: membership?.teamId ?? null });
  }),

  /**
   * Get all opt-in features with states for team settings page.
   */
  listForTeam: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user is a member of the team
      const membershipRepository = new MembershipRepository(prisma);
      const isMember = await membershipRepository.hasMembership({
        userId: ctx.user.id,
        teamId: input.teamId,
      });

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this team." });
      }

      const service = createFeatureOptInService();

      return service.listFeaturesForTeam({ teamId: input.teamId });
    }),

  /**
   * Get all opt-in features with states for organization settings page.
   * Organizations are teams with isOrganization=true, so we reuse team logic.
   */
  listForOrganization: authedProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user is a member of the organization
      const membershipRepository = new MembershipRepository(prisma);
      const isMember = await membershipRepository.hasMembership({
        userId: ctx.user.id,
        teamId: input.organizationId,
      });

      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this organization." });
      }

      const service = createFeatureOptInService();

      return service.listFeaturesForTeam({ teamId: input.organizationId });
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
      const service = createFeatureOptInService();

      await service.setUserFeatureState({
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

      const service = createFeatureOptInService();

      await service.setTeamFeatureState({
        teamId: input.teamId,
        featureId: input.featureId,
        state: input.state,
        assignedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Set organization's feature state (requires org admin).
   */
  setOrganizationState: authedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        featureId: z.string(),
        state: featureStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: input.organizationId,
        permission: "organization.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update organization feature settings.",
        });
      }

      const service = createFeatureOptInService();

      // Organizations use the same TeamFeatures table
      await service.setTeamFeatureState({
        teamId: input.organizationId,
        featureId: input.featureId,
        state: input.state,
        assignedBy: ctx.user.id,
      });

      return { success: true };
    }),
});
