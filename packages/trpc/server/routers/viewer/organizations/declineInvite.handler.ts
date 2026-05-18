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
  const { count } = await prisma.membership.deleteMany({
    where: {
      userId: ctx.user.id,
      teamId: input.teamId,
      accepted: false,
    },
  });

  if (count === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found or already accepted." });
  }

  return { success: true };
};
