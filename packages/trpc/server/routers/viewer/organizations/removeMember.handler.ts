import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRemoveMemberInputSchema } from "./schema";
import { assertCanManageOrganization } from "./organizationUtils";

type RemoveMemberHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberHandlerOptions) => {
  const membership = await assertCanManageOrganization({ userId: ctx.user.id });

  if (input.userId === ctx.user.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove yourself." });
  }

  const { count } = await prisma.membership.deleteMany({
    where: {
      userId: input.userId,
      teamId: membership.team.id,
      role: { not: MembershipRole.OWNER },
    },
  });

  if (count === 0) {
    const exists = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: input.userId, teamId: membership.team.id } },
      select: { role: true },
    });
    if (!exists) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
    }
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the organization owner." });
  }

  await prisma.$transaction([
    prisma.profile.deleteMany({
      where: { userId: input.userId, organizationId: membership.team.id },
    }),
    prisma.user.updateMany({
      where: { id: input.userId, organizationId: membership.team.id },
      data: { organizationId: null },
    }),
  ]);

  return { success: true };
};
