import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAcceptDeclineInviteInputSchema } from "./schema";
import { getProfileUsername } from "./organizationUtils";

type AcceptInviteHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TAcceptDeclineInviteInputSchema;
};

export const acceptInviteHandler = async ({ ctx, input }: AcceptInviteHandlerOptions) => {
  const [membership, user] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
      select: { accepted: true, teamId: true },
    }),
    prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { id: true, username: true, email: true, organizationId: true },
    }),
  ]);

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
  }

  if (membership.accepted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invite already accepted." });
  }

  if (user?.organizationId) {
    throw new TRPCError({ code: "CONFLICT", message: "You already belong to an organization." });
  }

  await prisma.$transaction([
    prisma.membership.update({
      where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
      data: { accepted: true },
    }),
    prisma.profile.create({
      data: {
        uid: uuidv4(),
        userId: ctx.user.id,
        organizationId: input.teamId,
        username: getProfileUsername(user ?? { email: "" }),
      },
    }),
    prisma.user.update({
      where: { id: ctx.user.id },
      data: { organizationId: input.teamId },
    }),
  ]);

  return { success: true };
};
