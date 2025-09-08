import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZLeaveTeamInput } from "./leaveTeam.schema";

type LeaveTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZLeaveTeamInput;
};

export const leaveTeamHandler = async ({ ctx, input }: LeaveTeamOptions) => {
  const { teamId } = input;
  const userId = ctx.user.id;

  const calIdMembership = await prisma.calIdMembership.findUnique({
    where: {
      userId_calIdTeamId: {
        userId,
        calIdTeamId: teamId,
      },
    },
  });

  if (!calIdMembership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this team",
    });
  }

  if (calIdMembership.role === CalIdMembershipRole.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot leave a team as the owner",
    });
  }

  await prisma.calIdMembership.delete({
    where: {
      userId_calIdTeamId: {
        userId,
        calIdTeamId: teamId,
      },
    },
  });
};
