import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
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

  // verify that all userIds are members of the team
  const teamMemberIds = await MembershipRepository.findAcceptedMembershipsByUserIdsInTeam({
    userIds,
    teamId,
  });

  const filteredUserIds = teamMemberIds.map((teamMember) => teamMember.userId);

  return await prisma.host.deleteMany({
    where: {
      eventTypeId: {
        in: eventTypeIds,
      },
      eventType: {
        teamId: teamId,
      },
      userId: {
        in: filteredUserIds,
      },
    },
  });
}

export default removeHostsFromEventTypesHandler;
