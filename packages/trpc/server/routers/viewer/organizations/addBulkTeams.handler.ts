import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAddBulkTeams } from "./addBulkTeams.schema";

type AddBulkTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddBulkTeams;
};

export async function addBulkTeamsHandler({ ctx, input }: AddBulkTeamsHandler) {
  const currentUser = ctx.user;

  if (!currentUser.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // check if user is admin of organization
  if (!(await isOrganisationAdmin(currentUser?.id, currentUser.organizationId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  // Loop over all users and check if they are already in the organization
  const usersInOrganization = await prisma.membership.findMany({
    where: {
      user: {
        organizationId: currentUser.organizationId,
        id: {
          in: input.userIds,
        },
      },
      accepted: true,
    },
  });

  // Throw error if any of the users are not in the organization. They should be invited to the organization via the onboaring flow first.
  if (usersInOrganization.length !== input.userIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more users are not in the organization",
    });
  }

  // Loop over all users and add them to all teams in the array
  const membershipData = input.userIds.flatMap((userId) =>
    input.teamIds.map((teamId) => {
      return {
        userId,
        teamId,
        role: MembershipRole.MEMBER,
      } as Prisma.MembershipCreateManyInput;
    })
  );

  await prisma.membership.createMany({
    data: membershipData,
  });

  return {
    success: true,
    invitedTotalUsers: input.userIds.length,
  };
}
