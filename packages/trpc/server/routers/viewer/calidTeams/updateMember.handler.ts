import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZUpdateMemberInput } from "./updateMember.schema";

type UpdateMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZUpdateMemberInput;
};

export const updateMemberHandler = async ({ ctx, input }: UpdateMemberOptions) => {
  const { teamId, memberId, impersonation } = input;
  const userId = ctx.user.id;

  if (userId !== memberId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You cannot view/edit members that are not your own",
    });
  }

  return await prisma.calIdMembership.update({
    where: { userId_calIdTeamId: { userId: memberId, calIdTeamId: teamId } },
    data: { impersonation: impersonation },
  });
};
