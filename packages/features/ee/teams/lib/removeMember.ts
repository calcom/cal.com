import logger from "@calcom/lib/logger";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { deleteWorkfowRemindersOfRemovedMember } from "./deleteWorkflowRemindersOfRemovedMember";

const log = logger.getSubLogger({ prefix: ["removeMember"] });

const removeMember = async ({
  memberId,
  teamId,
  isOrg,
}: {
  memberId: number;
  teamId: number;
  isOrg: boolean;
}) => {
  // First get the membership to ensure it exists
  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: { userId: memberId, teamId: teamId },
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      isOrganization: true,
      organizationSettings: true,
      id: true,
      metadata: true,
      activeOrgWorkflows: true,
      parentId: true,
    },
  });

  const foundUser = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      movedToProfileId: true,
      email: true,
      username: true,
      completedOnboarding: true,
      teams: {
        select: {
          team: {
            select: {
              id: true,
              parentId: true,
            },
          },
        },
      },
    },
  });

  if (!team || !foundUser) throw new TRPCError({ code: "NOT_FOUND" });

  if (isOrg) {
    log.debug("Removing a member from the organization");

    const userToDeleteMembershipOf = foundUser;

    const profileToDelete = await ProfileRepository.findByUserIdAndOrgId({
      userId: userToDeleteMembershipOf.id,
      organizationId: team.id,
    });

    if (
      userToDeleteMembershipOf.username &&
      userToDeleteMembershipOf.movedToProfileId === profileToDelete?.id
    ) {
      log.debug("Cleaning up tempOrgRedirect for user", userToDeleteMembershipOf.username);

      // deleteMany won't crash if no records are found
      await prisma.tempOrgRedirect.deleteMany({
        where: {
          from: userToDeleteMembershipOf.username,
        },
      });
    }

    const newUsername = foundUser.username != null ? `${foundUser.username}-${foundUser.id}` : null;

    await prisma.$transaction([
      // Remove user from all sub-teams event type hosts
      prisma.host.deleteMany({
        where: {
          userId: memberId,
          eventType: {
            team: {
              parentId: teamId,
            },
          },
        },
      }),
      // Delete managed child events in sub-teams
      prisma.eventType.deleteMany({
        where: {
          userId: membership.userId,
          parent: {
            team: {
              parentId: teamId,
            },
          },
        },
      }),
      // Remove organizationId from the user
      prisma.user.update({
        where: { id: membership.userId },
        data: {
          organizationId: null,
          // Update username to avoid conflicts with users outside organizations
          username: newUsername,
        },
      }),
      // Delete the profile of the user from the organization
      ProfileRepository.delete({
        userId: membership.userId,
        organizationId: team.id,
      }),
      // Delete all sub-team memberships where this team is the organization
      prisma.membership.deleteMany({
        where: {
          team: {
            parentId: teamId,
          },
          userId: membership.userId,
        },
      }),
      // Delete the membership of the user from the organization
      prisma.membership.delete({
        where: {
          userId_teamId: { userId: memberId, teamId: teamId },
        },
      }),
    ]);
  } else {
    log.debug("Removing a member from a team");

    await prisma.$transaction([
      // Remove user from all team event types' hosts
      prisma.host.deleteMany({
        where: {
          userId: memberId,
          eventType: {
            teamId: teamId,
          },
        },
      }),
      // Deleted managed event types from this team for this member
      prisma.eventType.deleteMany({
        where: { parent: { teamId: teamId }, userId: membership.userId },
      }),
      // Delete the membership of the user from the team
      prisma.membership.delete({
        where: {
          userId_teamId: { userId: memberId, teamId: teamId },
        },
      }),
    ]);
  }

  await deleteWorkfowRemindersOfRemovedMember(team, memberId, isOrg);

  return { membership };
};

export default removeMember;
