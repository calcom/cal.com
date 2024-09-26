import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TGetMembershipbyUserInputSchema } from "./getMembershipbyUser.schema";

type GetMembershipbyUserOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetMembershipbyUserInputSchema;
};

export const getMembershipbyUserHandler = async ({ ctx, input }: GetMembershipbyUserOptions) => {
  if (ctx.user.id !== input.memberId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You cannot view memberships that are not your own.",
    });
  }

  return await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId: input.memberId,
        teamId: input.teamId,
      },
    },
  });
};

export default getMembershipbyUserHandler;
