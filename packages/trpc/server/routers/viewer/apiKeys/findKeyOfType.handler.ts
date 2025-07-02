import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import type { TFindKeyOfTypeInputSchema } from "./findKeyOfType.schema";

type FindKeyOfTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFindKeyOfTypeInputSchema;
};

export const findKeyOfTypeHandler = async ({ ctx, input }: FindKeyOfTypeOptions) => {
  const { teamId, appId } = input;
  const userId = ctx.user.id;
  /** Only admin or owner can create apiKeys of team (if teamId is passed) */
  if (teamId) {
    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId,
      teamId,
      permission: "team.update",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
    if (!hasPermission) {
      throw new Error("Unauthorized");
    }
  }

  return await prisma.apiKey.findMany({
    where: {
      teamId,
      userId,
      appId,
    },
  });
};
