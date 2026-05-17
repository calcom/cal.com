import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const UserBelongsToTeamInput = z.object({
  teamId: z.coerce.number().optional().nullable(),
  selectedTeamId: z.coerce.number().optional().nullable(),
  isAll: z.boolean().optional(),
});

async function hasInsightsAccess(userId: number, teamId: number): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
      role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] },
    },
    select: { id: true },
  });
  return membership !== null;
}

export const userBelongsToTeamProcedure = authedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const parse = UserBelongsToTeamInput.safeParse(await getRawInput());
  if (!parse.success) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  // Validate the effective team: selectedTeamId takes precedence over teamId
  const effectiveTeamId = parse.data.selectedTeamId ?? parse.data.teamId;

  const membership = await ctx.prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      accepted: true,
      ...(effectiveTeamId && { teamId: effectiveTeamId }),
    },
    select: { id: true },
  });

  let isOwnerAdminOfParentTeam = false;

  if ((parse.data.isAll && ctx.user.organizationId) || (!membership && ctx.user.organizationId)) {
    if (!membership && ctx.user.organizationId && effectiveTeamId) {
      const isChildTeamOfOrg = await ctx.prisma.team.findFirst({
        where: {
          id: effectiveTeamId,
          parentId: ctx.user.organizationId,
        },
        select: { id: true },
      });
      if (!isChildTeamOfOrg) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }

    const hasAccess = await hasInsightsAccess(ctx.user.id, ctx.user.organizationId);
    if (!hasAccess) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    isOwnerAdminOfParentTeam = true;
  }

  if (!membership && !isOwnerAdminOfParentTeam && effectiveTeamId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
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
