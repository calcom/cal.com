import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";

type SetInviteExpirationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetInviteExpirationInputSchema;
};

export const setInviteExpirationHandler = async ({ ctx, input }: SetInviteExpirationOptions) => {
  const { token, expiresInDays } = input;

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      token: token,
    },
    select: {
      teamId: true,
      team: {
        select: { isOrganization: true },
      },
    },
  });

  if (!verificationToken) throw new TRPCError({ code: "NOT_FOUND" });
  if (!verificationToken.teamId) throw new TRPCError({ code: "UNAUTHORIZED" });

  const permissionCheckService = new PermissionCheckService();
  const isOrgContext = !!verificationToken.team?.isOrganization;
  const permission = isOrgContext ? "organization.invite" : "team.invite";
  const hasInvitePermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: verificationToken.teamId,
    permission,
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasInvitePermission) throw new TRPCError({ code: "UNAUTHORIZED" });

  const oneDay = 24 * 60 * 60 * 1000;
  const expires = expiresInDays
    ? new Date(Date.now() + expiresInDays * oneDay)
    : new Date("9999-12-31T23:59:59Z"); //maximum possible date incase the link is set to never expire

  await prisma.verificationToken.update({
    where: { token },
    data: {
      expires,
      expiresInDays: expiresInDays ? expiresInDays : null,
    },
  });
};

export default setInviteExpirationHandler;
