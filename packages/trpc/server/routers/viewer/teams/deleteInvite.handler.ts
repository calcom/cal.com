import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
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
  if (!verificationToken.teamId) throw new TRPCError({ code: "UNAUTHORIZED" });

  const permissionCheckService = new PermissionCheckService();
  const hasTeamInvitePermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: verificationToken.teamId,
    permission: "team.invite",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasTeamInvitePermission) throw new TRPCError({ code: "UNAUTHORIZED" });

  await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
};

export default deleteInviteHandler;
