import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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
  const teamHasMoreThanOneOwner = memberships.some((m) => m.role === MembershipRole.OWNER);

  if (myMembership?.role === MembershipRole.ADMIN && targetMembership?.role === MembershipRole.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not change the role of an owner if you are an admin.",
    });
  }

  if (!teamHasMoreThanOneOwner) {
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

  // Sync Services: Close.com
  closeComUpsertTeamUser(membership.team, membership.user, membership.role);
};

export default changeMemberRoleHandler;
