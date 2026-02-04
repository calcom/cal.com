import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const team = await prisma.team.findUnique({
    where: {
      id: input.teamId,
    },
    select: {
      isOrganization: true,
    },
  });

  if (!team) throw new TRPCError({ code: "NOT_FOUND" });

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: input.teamId,
    permission: team.isOrganization ? "organization.delete" : "team.delete",
    fallbackRoles: [MembershipRole.OWNER],
  });

  if (!hasPermission) throw new TRPCError({ code: "FORBIDDEN" });

  return await TeamService.delete({ id: input.teamId });
};

export default deleteHandler;
