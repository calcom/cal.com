import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateMemberRoleInputSchema } from "./schema";
import { assertCanManageOrganization } from "./organizationUtils";

type UpdateMemberRoleHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TUpdateMemberRoleInputSchema;
};

export const updateMemberRoleHandler = async ({ ctx, input }: UpdateMemberRoleHandlerOptions) => {
  const membership = await assertCanManageOrganization({ userId: ctx.user.id });

  const target = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: input.userId, teamId: membership.team.id } },
    select: { role: true },
  });

  if (!target) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
  }

  if (target.role === MembershipRole.OWNER) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change the owner's role." });
  }

  await prisma.membership.update({
    where: { userId_teamId: { userId: input.userId, teamId: membership.team.id } },
    data: { role: input.role },
  });

  return { success: true };
};
