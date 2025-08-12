import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TUpdateMembershipInputSchema } from "./updateMembership.schema";

type UpdateMembershipOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateMembershipInputSchema;
};

export const updateMembershipHandler = async ({ ctx, input }: UpdateMembershipOptions) => {
  if (ctx.user.id !== input.memberId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You cannot edit memberships that are not your own.",
    });
  }

  return await prisma.membership.update({
    where: {
      userId_teamId: {
        userId: input.memberId,
        teamId: input.teamId,
      },
    },
    data: {
      disableImpersonation: input.disableImpersonation,
    },
  });
};

export default updateMembershipHandler;
