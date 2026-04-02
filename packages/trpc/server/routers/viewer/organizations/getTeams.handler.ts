import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";

type GetTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function getTeamsHandler({ ctx }: GetTeamsHandler) {
  const currentUser = ctx.user;
  const currentUserOrgId = ctx.user.organizationId ?? currentUser.profiles[0].organizationId;

  if (!currentUserOrgId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // Check if user has permission to read teams in the organization
  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: currentUser.id,
    teamId: currentUserOrgId,
    permission: "team.read",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to view teams in this organization",
    });
  }

  const teamRepository = new TeamRepository(prisma);
  const allOrgTeams = await teamRepository.findAllByParentId({
    parentId: currentUserOrgId,
    select: {
      id: true,
      name: true,
    },
  });

  return allOrgTeams;
}

export default getTeamsHandler;
