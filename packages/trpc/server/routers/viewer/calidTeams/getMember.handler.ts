import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZGetMemberInput } from "./getMember.schema";

type GetMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZGetMemberInput;
};

export const getMemberHandler = async ({ ctx, input }: GetMemberOptions) => {
  const { teamId, memberId } = input;
  const userId = ctx.user.id;

  if (userId !== memberId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You cannot view/edit members that are not your own",
    });
  }

  return await prisma.calIdMembership.findUnique({
    where: {
      userId_calIdTeamId: {
        userId,
        calIdTeamId: teamId,
      },
    },
  });
};
