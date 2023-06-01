import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const { logo, bio, orgId } = input;

  const userMembership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: orgId,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  if (!userMembership || userMembership.role !== MembershipRole.OWNER)
    throw new TRPCError({ code: "BAD_REQUEST", message: "not_authorized" });

  await prisma.team.update({
    where: {
      id: orgId,
    },
    data: {
      bio,
      logo,
    },
  });

  return { update: true, userId: userMembership.userId };
};
