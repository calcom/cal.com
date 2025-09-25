import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";

type RemoveHostsFromEventTypes = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveHostsFromEventTypes;
};

export async function removeHostsFromEventTypesHandler({ ctx, input }: RemoveHostsFromEventTypes) {
  const { userIds, eventTypeIds, teamId } = input;

  const permissionCheckService = new PermissionCheckService();
  const hasEventTypeUpdatePermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId,
    permission: "eventType.update",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  // check if user has permission to update event types
  if (!hasEventTypeUpdatePermission) throw new TRPCError({ code: "UNAUTHORIZED" });

  return await prisma.host.deleteMany({
    where: {
      eventTypeId: {
        in: eventTypeIds,
      },
      userId: {
        in: userIds,
      },
    },
  });
}

export default removeHostsFromEventTypesHandler;
