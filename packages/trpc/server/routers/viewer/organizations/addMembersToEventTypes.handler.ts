import type { Prisma } from "@prisma/client";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";
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

  // check if user is admin of organization
  const permissionCheckService = new PermissionCheckService();
  if (
    !(await permissionCheckService.checkPermission({
      userId: ctx.user?.id,
      teamId: ctx.user.organizationId,
      permission: "organization.listMembers",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    }))
  )
    throw new TRPCError({ code: "UNAUTHORIZED" });

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
