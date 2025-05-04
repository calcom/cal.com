import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
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
  if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  // Only owners can award owner role.
  if (input.role === MembershipRole.OWNER && !(await isTeamOwner(ctx.user?.id, input.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });
  const memberships = await prisma.membership.findMany({
    where: {
      teamId: input.teamId,
    },
  });

  const targetMembership = memberships.find((m) => m.userId === input.memberId);
  const myMembership = memberships.find((m) => m.userId === ctx.user.id);
  const teamOwners = memberships.filter((m) => m.role === MembershipRole.OWNER);
  const teamHasMoreThanOneOwner = teamOwners.length > 1;

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

  if (
    myMembership?.role === MembershipRole.ADMIN &&
    input.memberId === ctx.user.id &&
    input.role !== MembershipRole.MEMBER
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not change yourself to a higher role.",
    });
  }

  const membership = await prisma.membership.update({
    where: {
      userId_teamId: { userId: input.memberId, teamId: input.teamId },
    },
    data: {
      role: input.role,
    },
    include: {
      team: true,
      user: true,
    },
  });
};

export default changeMemberRoleHandler;
