import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TChangeMemberRoleInputSchema } from "./changeMemberRole.schema";

type ChangeMemberRoleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TChangeMemberRoleInputSchema;
};

export const changeMemberRoleHandler = async ({ ctx, input }: ChangeMemberRoleOptions) => {
  // Get team info to check if it's part of an organization
  const teamRepo = new TeamRepository(prisma);
  const team = await teamRepo.findById({ id: input.teamId });
  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  // Get the organization ID (either the team's parent or the team itself if it's an org)
  const organizationId = team.parentId || input.teamId;

  // Create role manager for this organization/team
  const roleManager = await RoleManagementFactory.getInstance().createRoleManager(organizationId);

  // Check permission to change roles (includes legacy validation for LegacyRoleManager)
  try {
    await roleManager.checkPermissionToChangeRole(
      ctx.user.id,
      input.teamId,
      "team",
      input.memberId,
      input.role
    );
  } catch (error) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: error instanceof Error ? error.message : "Unauthorized",
    });
  }

  // Get the target membership for the assignRole method
  const targetMembership = await prisma.membership.findUnique({
    where: {
      userId_teamId: { userId: input.memberId, teamId: input.teamId },
    },
  });

  if (!targetMembership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Target membership not found" });
  }

  // Use role manager to assign the role
  try {
    await roleManager.assignRole(input.memberId, input.teamId, input.role, targetMembership.id);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Failed to assign role",
    });
  }

  // Return updated membership
  const updatedMembership = await prisma.membership.findUnique({
    where: {
      userId_teamId: { userId: input.memberId, teamId: input.teamId },
    },
    include: {
      team: true,
      user: true,
    },
  });

  return updatedMembership;
};

export default changeMemberRoleHandler;
