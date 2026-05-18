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

  const { count } = await prisma.membership.updateMany({
    where: {
      userId: input.userId,
      teamId: membership.team.id,
      role: { not: MembershipRole.OWNER },
    },
    data: { role: input.role },
  });

  if (count === 0) {
    const exists = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: input.userId, teamId: membership.team.id } },
      select: { role: true },
    });
    if (!exists) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
    }
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change the owner's role." });
  }

  return { success: true };
};
