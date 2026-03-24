import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { SeatChangeTrackingService } from "@calcom/features/ee/billing/service/seatTracking/SeatChangeTrackingService";
import { CustomAction, Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TBulkUsersDelete } from "./bulkDeleteUsers.schema.";

type BulkDeleteUsersHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkUsersDelete;
};

export async function bulkDeleteUsersHandler({ ctx, input }: BulkDeleteUsersHandler) {
  const currentUser = ctx.user;
  const currentUserOrgId = currentUser.organizationId ?? currentUser.profiles[0].organizationId;

  if (!currentUserOrgId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // Get user's membership role in the organization
  const membership = await prisma.membership.findFirst({
    where: {
      userId: currentUser.id,
      teamId: currentUserOrgId,
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User is not a member of this organization." });
  }

  // Check PBAC permissions for removing organization members
  const permissions = await getSpecificPermissions({
    userId: currentUser.id,
    teamId: currentUserOrgId,
    resource: Resource.Organization,
    userRole: membership.role,
    actions: [CustomAction.Remove],
    fallbackRoles: {
      [CustomAction.Remove]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!permissions[CustomAction.Remove]) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const usersToRemove = await prisma.user.findMany({
    where: { id: { in: input.userIds } },
    select: { id: true, username: true },
  });

  const orgMembershipRemovalCount = await prisma.$transaction(async (tx) => {
    await tx.profile.deleteMany({
      where: {
        userId: { in: input.userIds },
        organizationId: currentUserOrgId,
      },
    });

    const { count } = await tx.membership.deleteMany({
      where: {
        teamId: currentUserOrgId,
        userId: { in: input.userIds },
      },
    });

    await tx.membership.deleteMany({
      where: {
        userId: { in: input.userIds },
        team: { parentId: currentUserOrgId },
      },
    });

    await Promise.all(
      usersToRemove.map((user) =>
        tx.user.update({
          where: { id: user.id },
          data: {
            organizationId: null,
            username: user.username ? `${user.username}-${user.id}` : null,
          },
        })
      )
    );

    await tx.eventType.deleteMany({
      where: {
        userId: { in: input.userIds },
        parent: {
          team: {
            OR: [{ parentId: currentUserOrgId }, { id: currentUserOrgId }],
          },
        },
      },
    });

    await tx.host.deleteMany({
      where: {
        userId: { in: input.userIds },
        eventType: {
          team: {
            OR: [{ parentId: currentUserOrgId }, { id: currentUserOrgId }],
          },
        },
      },
    });

    return count;
  });

  if (orgMembershipRemovalCount > 0) {
    const seatTracker = new SeatChangeTrackingService();
    await seatTracker.logSeatRemoval({
      teamId: currentUserOrgId,
      seatCount: orgMembershipRemovalCount,
      triggeredBy: currentUser.id,
    });
  }

  const teamBillingServiceFactory = getTeamBillingServiceFactory();
  const teamBillingService = await teamBillingServiceFactory.findAndInit(currentUserOrgId);
  await teamBillingService.updateQuantity("removal");

  return {
    success: true,
    usersDeleted: input.userIds.length,
  };
}

export default bulkDeleteUsersHandler;
