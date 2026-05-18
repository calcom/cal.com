import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAcceptDeclineInviteInputSchema } from "./schema";

type DeclineInviteHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TAcceptDeclineInviteInputSchema;
};

export const declineInviteHandler = async ({ ctx, input }: DeclineInviteHandlerOptions) => {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    select: { accepted: true },
  });

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
  }

  if (membership.accepted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot decline an already accepted invite." });
  }

  await prisma.membership.delete({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
  });

  return { success: true };
};
