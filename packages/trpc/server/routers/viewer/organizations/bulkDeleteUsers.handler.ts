import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
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

  // Loop over all users in input.userIds and remove all memberships for the organization including child teams
  const deleteMany = prisma.membership.deleteMany({
    where: {
      userId: {
        in: input.userIds,
      },
      team: {
        OR: [
          {
            parentId: currentUserOrgId,
          },
          { id: currentUserOrgId },
        ],
      },
    },
  });

  const removeOrgrelation = prisma.user.updateMany({
    where: {
      id: {
        in: input.userIds,
      },
    },
    data: {
      organizationId: null,
      // Set username to null - to make sure there is no conflicts
      username: null,
      // Set completedOnboarding to false - to make sure the user has to complete onboarding again -> Setup a new username
      completedOnboarding: false,
    },
  });

  const removeManagedEventTypes = prisma.eventType.deleteMany({
    where: {
      userId: {
        in: input.userIds,
      },
      parent: {
        team: {
          OR: [
            {
              parentId: currentUserOrgId,
            },
            { id: currentUserOrgId },
          ],
        },
      },
    },
  });

  const removeHostAssignment = prisma.host.deleteMany({
    where: {
      userId: {
        in: input.userIds,
      },
      eventType: {
        team: {
          OR: [
            {
              parentId: currentUserOrgId,
            },
            { id: currentUserOrgId },
          ],
        },
      },
    },
  });

  const removeProfiles = ProfileRepository.deleteMany({
    userIds: input.userIds,
  });

  // We do this in a transaction to make sure that all memberships are removed before we remove the organization relation from the user
  // We also do this to make sure that if one of the queries fail, the whole transaction fails
  await prisma.$transaction([
    removeProfiles,
    deleteMany,
    removeOrgrelation,
    removeManagedEventTypes,
    removeHostAssignment,
  ]);

  const teamBillingServiceFactory = getTeamBillingServiceFactory();
  const teamBillingService = await teamBillingServiceFactory.findAndInit(currentUserOrgId);
  await teamBillingService.updateQuantity();

  return {
    success: true,
    usersDeleted: input.userIds.length,
  };
}

export default bulkDeleteUsersHandler;
