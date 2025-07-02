import { checkPermissionWithFallback } from "@calcom/features/pbac/lib/checkPermissionWithFallback";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDeleteInviteInputSchema } from "./deleteInvite.schema";

type DeleteInviteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInviteInputSchema;
};

export const deleteInviteHandler = async ({ ctx, input }: DeleteInviteOptions) => {
  const { token } = input;

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      token: token,
    },
    select: {
      teamId: true,
      id: true,
    },
  });

  if (!verificationToken) throw new TRPCError({ code: "NOT_FOUND" });
  if (
    !verificationToken.teamId ||
    !(await checkPermissionWithFallback({
      userId: ctx.user.id,
      teamId: verificationToken.teamId,
      permission: "team.update",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    }))
  )
    throw new TRPCError({ code: "UNAUTHORIZED" });

  await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
};

export default deleteInviteHandler;
