import { TeamBilling } from "@calcom/ee/billing/teams";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
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

  // check if user is admin of organization
  if (!(await isOrganisationAdmin(currentUser?.id, currentUserOrgId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

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

  const teamBilling = await TeamBilling.findAndInit(currentUserOrgId);
  await teamBilling.updateQuantity();

  return {
    success: true,
    usersDeleted: input.userIds.length,
  };
}

export default bulkDeleteUsersHandler;
