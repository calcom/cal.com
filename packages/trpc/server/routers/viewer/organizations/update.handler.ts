import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
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
  const { logo, bio, orgId, password } = input;
  debugger;
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

  // TODO test this check works
  if (!userMembership || userMembership.role !== MembershipRole.OWNER)
    throw new TRPCError({ code: "BAD_REQUEST", message: "not_authorized" });

  if (password) {
    const hashedPassword = await hashPassword(password);
    await prisma.user.update({
      where: {
        id: ctx.user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return { update: true };
  }

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
