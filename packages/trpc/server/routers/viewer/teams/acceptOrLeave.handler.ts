import { MembershipRole } from "@prisma/client";

import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";

type AcceptOrLeaveOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAcceptOrLeaveInputSchema;
};

export const acceptOrLeaveHandler = async ({ ctx, input }: AcceptOrLeaveOptions) => {
  if (input.accept) {
    const membership = await prisma.membership.update({
      where: {
        userId_teamId: { userId: ctx.user.id, teamId: input.teamId },
      },
      data: {
        accepted: true,
      },
      include: {
        team: true,
      },
    });

    closeComUpsertTeamUser(membership.team, ctx.user, membership.role);
  } else {
    try {
      //get team owner so we can alter their subscription seat count
      const teamOwner = await prisma.membership.findFirst({
        where: { teamId: input.teamId, role: MembershipRole.OWNER },
        include: { team: true },
      });

      const membership = await prisma.membership.delete({
        where: {
          userId_teamId: { userId: ctx.user.id, teamId: input.teamId },
        },
      });

      // Sync Services: Close.com
      if (teamOwner) closeComUpsertTeamUser(teamOwner.team, ctx.user, membership.role);
    } catch (e) {
      console.log(e);
    }
  }
};
