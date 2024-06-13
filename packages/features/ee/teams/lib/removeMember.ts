import logger from "@calcom/lib/logger";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";
import { deleteAllWorkflowReminders } from "@calcom/trpc/server/routers/viewer/workflows/util";

import { TRPCError } from "@trpc/server";

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
  const [membership] = await prisma.$transaction([
    prisma.membership.delete({
      where: {
        userId_teamId: { userId: memberId, teamId: teamId },
      },
      include: {
        user: true,
        team: true,
      },
    }),
    // remove user as host from team events associated with this membership
    prisma.host.deleteMany({
      where: {
        userId: memberId,
        eventType: {
          teamId: teamId,
        },
      },
    }),
  ]);

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
    const orgId = team.id;

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
      organizationId: orgId,
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
        data: { organizationId: null },
      }),
      ProfileRepository.delete({
        userId: membership.userId,
        organizationId: orgId,
      }),
    ]);

    // delete all workflowReminders of the removed team member that come from org workflows
    const workflowRemindersToDelete = await prisma.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflow: {
            teamId: orgId,
          },
        },
        booking: {
          eventType: {
            userId: memberId,
          },
        },
      },
      select: {
        id: true,
        referenceId: true,
        method: true,
      },
    });

    deleteAllWorkflowReminders(workflowRemindersToDelete);
  }

  // Deleted managed event types from this team from this member
  await prisma.eventType.deleteMany({
    where: { parent: { teamId: teamId }, userId: membership.userId },
  });

  // cancel/delete all workflowReminders of the removed member that come from that team (org teams only)
  if (team.parentId) {
    const isUserMemberOfOtherTeams = !!foundUser.teams.filter(
      (userTeam) => userTeam.team.id !== team.id && !!userTeam.team.parentId
    ).length;

    const removedWorkflows = await prisma.workflow.findMany({
      where: {
        OR: [
          {
            activeOnTeams: {
              some: {
                teamId: team.id,
              },
              //don't delete reminder, if user is still part of another team that is active on this workflow
              none: {
                team: {
                  members: {
                    some: {
                      userId: memberId,
                    },
                  },
                },
              },
            },
            // if user is still a member of other teams in the org, we also need to make sure that the found workflow is not active on all teams
            ...(isUserMemberOfOtherTeams && {
              isActiveOnAll: false,
            }),
          },
          {
            // workflows of the org that are set active on all teams (and the user is not member of any other team)
            teamId: team.parentId,
            ...(!isUserMemberOfOtherTeams && {
              isActiveOnAll: true,
            }),
          },
        ],
      },
    });

    const workflowRemindersToDelete = await prisma.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflowId: {
            in: removedWorkflows?.map((workflow) => workflow.id) ?? [],
          },
        },
        booking: {
          eventType: {
            userId: memberId,
          },
        },
      },
      select: {
        id: true,
        referenceId: true,
        method: true,
      },
    });

    deleteAllWorkflowReminders(workflowRemindersToDelete);
  }

  return { membership };
};

export default removeMember;
