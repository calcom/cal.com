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
  if (!ctx.user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // Check if user has permission to manage event types in the organization
  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: ctx.user.organizationId,
    permission: "eventType.update",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to manage event types in this organization",
    });
  }

  const { userIds, eventTypeIds } = input;

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
