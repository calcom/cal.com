import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
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

  // Check permission to change roles
  try {
    await roleManager.checkPermissionToChangeRole(ctx.user.id, organizationId);
  } catch (error) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: error instanceof Error ? error.message : "Unauthorized",
    });
  }

  // For traditional role checks, fall back to existing logic
  if (
    typeof input.role === "string" &&
    Object.values(MembershipRole).includes(input.role as MembershipRole)
  ) {
    // Traditional role assignment logic
    if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
    // Only owners can award owner role.
    if (input.role === MembershipRole.OWNER && !(await isTeamOwner(ctx.user?.id, input.teamId)))
      throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const memberships = await prisma.membership.findMany({
    where: {
      teamId: input.teamId,
    },
  });

  const targetMembership = memberships.find((m) => m.userId === input.memberId);
  const myMembership = memberships.find((m) => m.userId === ctx.user.id);
  const teamOwners = memberships.filter((m) => m.role === MembershipRole.OWNER);
  const teamHasMoreThanOneOwner = teamOwners.length > 1;

  if (!targetMembership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Target membership not found" });
  }

  if (myMembership?.role === MembershipRole.ADMIN && targetMembership?.role === MembershipRole.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not change the role of an owner if you are an admin.",
    });
  }

  if (targetMembership?.role === MembershipRole.OWNER && !teamHasMoreThanOneOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not change the role of the only owner of a team.",
    });
  }

  // TODO(SEAN): Remove this logic once PBAC is rolled out as there is no concept of higher roles for custom roles. Only default.
  if (
    myMembership?.role === MembershipRole.ADMIN &&
    input.memberId === ctx.user.id &&
    typeof input.role === "string" &&
    Object.values(MembershipRole).includes(input.role as MembershipRole) &&
    input.role !== MembershipRole.MEMBER
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not change yourself to a higher role.",
    });
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
