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
    // Deleting membership from all child teams
    // Delete all sub-team memberships where this team is the organization
    await prisma.membership.deleteMany({
      where: {
        team: {
          parentId: teamId,
        },
        userId: membership.userId,
      },
    });

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

      await prisma.tempOrgRedirect.deleteMany({
        where: {
          from: userToDeleteMembershipOf.username,
        },
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: membership.userId },
        data: { 
          organizationId: null,
          // Update username to avoid conflicts with users outside organizations
          username: foundUser.username ? `${foundUser.username}-${membership.userId}` : null
        },
      }),
      ProfileRepository.delete({
        userId: membership.userId,
        organizationId: team.id,
      }),
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
    ]);
  }

  // Deleted managed event types from this team from this member
  await prisma.eventType.deleteMany({
    where: { parent: { teamId: teamId }, userId: membership.userId },
  });

  // If removing from organization, also delete managed child events in sub-teams
  if (isOrg) {
    await prisma.eventType.deleteMany({
      where: {
        userId: membership.userId,
        parent: {
          team: {
            parentId: teamId,
          },
        },
      },
    });
  }

  await deleteWorkfowRemindersOfRemovedMember(team, memberId, isOrg);

  return { membership };
};

export default removeMember;
