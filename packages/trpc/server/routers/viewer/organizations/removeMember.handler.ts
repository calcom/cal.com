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

  const target = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: input.userId, teamId: membership.team.id } },
    select: { role: true },
  });

  if (!target) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
  }

  if (target.role === MembershipRole.OWNER) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the organization owner." });
  }

  await prisma.membership.delete({
    where: { userId_teamId: { userId: input.userId, teamId: membership.team.id } },
  });

  return { success: true };
};
