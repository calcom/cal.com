import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAddMembersToEventTypes } from "./addMembersToEventTypes.schema";

type AddBulkToEventTypeHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddMembersToEventTypes;
};

export async function addMembersToEventTypesHandler({ ctx, input }: AddBulkToEventTypeHandler) {
  const { eventTypeIds, userIds, teamId } = input;

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId,
    permission: "eventType.update",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  // check if user has eventType.update permission
  if (!hasPermission) throw new TRPCError({ code: "UNAUTHORIZED" });

  const data: Prisma.HostCreateManyInput[] = eventTypeIds.flatMap((eventId) =>
    userIds.map((userId) => ({
      eventTypeId: eventId,
      userId: userId,
      priority: 2, // Default medium priority
    }))
  );

  return await prisma.host.createMany({
    data,
    // skip if user already a host in eventType
    skipDuplicates: true,
  });
}

export default addMembersToEventTypesHandler;
