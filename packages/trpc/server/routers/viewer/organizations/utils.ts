import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAddMembersToTeams } from "./addMembersToTeams.schema";

interface AddBulkToTeamProps {
  user: NonNullable<TrpcSessionUser>;
  input: TAddMembersToTeams;
}

export const addMembersToTeams = async ({ user, input }: AddBulkToTeamProps) => {
  if (!user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // check if user is admin of organization
  if (!(await isOrganisationAdmin(user?.id, user.organizationId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  const usersInOrganization = await prisma.membership.findMany({
    where: {
      teamId: user.organizationId,
      user: {
        id: {
          in: input.userIds,
        },
      },
    },
    distinct: ["userId"],
  });

  // Throw error if any of the users are not in the organization. They should be invited to the organization via the onboaring flow first.
  if (usersInOrganization.length !== input.userIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more users are not in the organization",
    });
  }

  // loop over all users and check if they are already in team they are being invited to
  const usersInTeams = await prisma.membership.findMany({
    where: {
      userId: {
        in: input.userIds,
      },
      teamId: {
        in: input.teamIds,
      },
    },
  });

  // Filter out users who are already in teams they are being invited to
  const filteredUserIds = input.userIds.filter((userId) => {
    return !usersInTeams.some((membership) => membership.userId === userId);
  });

  // TODO: might need to come back to this is people are doing ALOT of invites with bulk actions.
  // Loop over all users and add them to all teams in the array
  const membershipData = filteredUserIds.flatMap((userId) =>
    input.teamIds.map((teamId) => {
      const userMembership = usersInOrganization.find((membership) => membership.userId === userId);
      const accepted = userMembership && userMembership.accepted;
      return {
        userId,
        teamId,
        role: MembershipRole.MEMBER,
        accepted: accepted || false,
      } as Prisma.MembershipCreateManyInput;
    })
  );

  await prisma.membership.createMany({
    data: membershipData,
  });

  membershipData.forEach(async ({ userId, teamId }) => {
    await updateNewTeamMemberEventTypes(userId, teamId);
  });

  return {
    success: true,
    invitedTotalUsers: input.userIds.length,
  };
};
