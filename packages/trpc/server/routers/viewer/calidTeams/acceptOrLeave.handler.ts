import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";

type AcceptOrLeaveOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAcceptOrLeaveInputSchema;
};

export const acceptOrLeaveHandler = async ({ ctx, input }: AcceptOrLeaveOptions) => {
  if (input.accept) {
    const teamMembership = await prisma.calIdMembership.update({
      where: {
        userId_calIdTeamId: { userId: ctx.user.id, calIdTeamId: input.teamId },
      },
      data: {
        acceptedInvitation: true,
      },
      include: {
        calIdTeam: true,
      },
    });

    return teamMembership;
  } else {
    try {
      const membership = await prisma.calIdMembership.delete({
        where: {
          userId_calIdTeamId: { userId: ctx.user.id, calIdTeamId: input.teamId },
        },
        include: {
          calIdTeam: true,
        },
      });

      return membership;
    } catch (e) {
      console.error("Error deleting team membership:", e);
      throw new Error("Failed to leave team");
    }
  }
};

export default acceptOrLeaveHandler;
