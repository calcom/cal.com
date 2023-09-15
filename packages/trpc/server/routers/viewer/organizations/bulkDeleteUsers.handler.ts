import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
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

  if (!currentUser.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // check if user is admin of organization
  if (!(await isOrganisationAdmin(currentUser?.id, currentUser.organizationId)))
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
            parentId: currentUser.organizationId,
          },
          { id: currentUser.organizationId },
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
      // Remove organization relation
      organizationId: null,
      // Set username to null - to make sure there is no conflicts
      username: null,
      // Set completedOnboarding to false - to make sure the user has to complete onboarding again -> Setup a new username
      completedOnboarding: false,
    },
  });
  // We do this in a transaction to make sure that all memberships are removed before we remove the organization relation from the user
  // We also do this to make sure that if one of the queries fail, the whole transaction fails
  await prisma.$transaction([deleteMany, removeOrgrelation]);

  return {
    success: true,
    usersDeleted: input.userIds.length,
  };
}

export default bulkDeleteUsersHandler;
