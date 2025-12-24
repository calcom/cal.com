import { z } from "zod";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";

import { TRPCError } from "@trpc/server";

const UserBelongsToTeamInput = z.object({
  teamId: z.coerce.number().optional().nullable(),
  isAll: z.boolean().optional(),
});

async function checkInsightsPermission(userId: number, teamId: number): Promise<boolean> {
  const permissionCheckService = new PermissionCheckService();
  return await permissionCheckService.checkPermission({
    userId,
    teamId,
    permission: "insights.read",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });
}

export const userBelongsToTeamProcedure = authedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const parse = UserBelongsToTeamInput.safeParse(await getRawInput());
  if (!parse.success) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  // If teamId is provided, check if user belongs to team
  // If teamId is not provided, check if user belongs to any team

  const membership = await ctx.insightsDb.membership.findFirst({
    where: {
      userId: ctx.user.id,
      accepted: true,
      ...(parse.data.teamId && { teamId: parse.data.teamId }),
    },
    select: { id: true },
  });

  let isOwnerAdminOfParentTeam = false;

  // Probably we couldn't find a membership because the user is not a direct member of the team
  // So that would mean ctx.user.organization is present
  if ((parse.data.isAll && ctx.user.organizationId) || (!membership && ctx.user.organizationId)) {
    //Look for membership type in organizationId
    if (!membership && ctx.user.organizationId && parse.data.teamId) {
      const isChildTeamOfOrg = await ctx.insightsDb.team.findFirst({
        where: {
          id: parse.data.teamId,
          parentId: ctx.user.organizationId,
        },
        select: { id: true },
      });
      if (!isChildTeamOfOrg) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }

    const hasOrgAccess = await checkInsightsPermission(ctx.user.id, ctx.user.organizationId);
    if (!hasOrgAccess) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    isOwnerAdminOfParentTeam = true;
  }

  return next({
    ctx: {
      user: {
        ...ctx.user,
        isOwnerAdminOfParentTeam,
      },
    },
  });
});
