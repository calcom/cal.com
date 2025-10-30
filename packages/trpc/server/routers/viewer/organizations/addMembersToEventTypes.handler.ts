import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
import { addMembersToTeams } from "./utils";

type AddBulkToEventTypeHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddMembersToEventTypes;
};

export async function addMembersToEventTypesHandler({ ctx, input }: AddBulkToEventTypeHandler) {
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

  const { eventTypeIds, teamIds, userIds } = input;

  // invite users to whatever teams necessary
  await addMembersToTeams({
    user: ctx.user,
    input: {
      teamIds,
      userIds,
    },
  });

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
