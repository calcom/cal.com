import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAcceptDeclineInviteInputSchema } from "./schema";

type AcceptInviteHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TAcceptDeclineInviteInputSchema;
};

export const acceptInviteHandler = async ({ ctx, input }: AcceptInviteHandlerOptions) => {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    select: { accepted: true, teamId: true },
  });

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
  }

  if (membership.accepted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invite already accepted." });
  }

  await prisma.$transaction([
    prisma.membership.update({
      where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
      data: { accepted: true },
    }),
    prisma.user.update({
      where: { id: ctx.user.id },
      data: { organizationId: input.teamId },
    }),
  ]);

  return { success: true };
};
