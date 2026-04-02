import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TCreateInviteInputSchema } from "./createInvite.schema";

type CreateInviteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInviteInputSchema;
};

export const createInviteHandler = async ({ ctx, input }: CreateInviteOptions) => {
  const { teamId } = input;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { parentId: true, isOrganization: true },
  });

  if (!team) throw new TRPCError({ code: "NOT_FOUND" });

  const permissionCheckService = new PermissionCheckService();
  const permission = team.isOrganization ? "organization.invite" : "team.invite";
  const hasInvitePermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId,
    permission,
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasInvitePermission) throw new TRPCError({ code: "UNAUTHORIZED" });

  const result = await TeamService.createInvite(teamId, { token: input.token });
  return result;
};

export default createInviteHandler;
