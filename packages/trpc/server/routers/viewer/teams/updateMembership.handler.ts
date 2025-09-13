import { UserPlanUtils } from "@calcom/lib/user-plan-utils";
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

  const result = await prisma.membership.update({
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

  await UserPlanUtils.updateUserPlan(input.memberId);

  return result;
};

export default updateMembershipHandler;
