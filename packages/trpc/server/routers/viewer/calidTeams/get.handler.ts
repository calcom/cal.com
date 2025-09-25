import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZGetCalidTeamInput } from "./get.schema";

type GetTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetCalidTeamInput;
};

export const getCalidTeamHandler = async ({ ctx, input }: GetTeamOptions) => {
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
      code: "UNAUTHORIZED",
      message: "You are not a member of this team",
    });
  }

  const calIdTeam = await prisma.calIdTeam.findUnique({
    where: {
      id: calIdMembership.calIdTeamId,
    },
  });

  if (!calIdTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  return {
    ...calIdTeam,
    membership: calIdMembership,
  };
};
