import { emitAuditEvent } from "@calcom/features/audit/di/AuditProducerService.container";
import { AuditActions } from "@calcom/features/audit/types/auditAction";
import { AuditSources } from "@calcom/features/audit/types/auditSource";
import { AuditTargets } from "@calcom/features/audit/types/auditTarget";
import { getTeamRepository } from "@calcom/features/di/containers/TeamRepository";
import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TChangeMemberRoleInputSchema } from "./changeMemberRole.schema";

type ChangeMemberRoleOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "uuid" | "organizationId">;
    sourceIp?: string;
  };
  input: TChangeMemberRoleInputSchema;
};

export const changeMemberRoleHandler = async ({ ctx, input }: ChangeMemberRoleOptions) => {
  // Get team info to check if it's part of an organization
  const teamRepo = getTeamRepository();
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

  const previousRole = targetMembership.role;

  // Use role manager to assign the role
  try {
    await roleManager.assignRole(input.memberId, input.teamId, input.role, targetMembership.id);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Failed to assign role",
    });
  }

  void emitAuditEvent({
    actor: { userUuid: ctx.user.uuid },
    action: AuditActions.ROLE_CHANGED,
    source: AuditSources.WEBAPP,
    targetType: AuditTargets.membership,
    targetId: String(targetMembership.id),
    previousValue: String(previousRole),
    newValue: String(input.role),
    orgId: ctx.user.organizationId ?? null,
    ip: ctx.sourceIp,
  });

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
