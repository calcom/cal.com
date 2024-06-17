import type { PrismaClient } from "@calcom/prisma";
import prismaDefault from "@calcom/prisma";
import { deleteAllWorkflowReminders } from "@calcom/trpc/server/routers/viewer/workflows/util";

// cancel/delete all workflowReminders of the removed member that come from that team (org teams only)
export async function deleteWorkfowRemindersOfRemovedMember(
  team: {
    id: number;
    parentId?: number | null;
  },
  memberId: number,
  otherTeams: { id: number; parentId: number | null }[],
  isOrg: boolean,
  prisma: PrismaClient = prismaDefault
) {
  if (isOrg) {
    // if member was removed from org, delete all workflowReminders of the removed team member that come from org workflows
    const workflowRemindersToDelete = await prisma.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflow: {
            teamId: team.id,
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

    deleteAllWorkflowReminders(workflowRemindersToDelete, prisma);
  } else {
    if (!team.parentId) return;

    // member was removed from an org team
    const isUserMemberOfOtherTeams = !otherTeams.filter((team) => team.id !== team.id && !!team.parentId)
      .length;

    const removedWorkflows = await prisma.workflow.findMany({
      where: {
        OR: [
          {
            AND: [
              {
                activeOnTeams: {
                  some: {
                    teamId: team.id,
                  },
                },
              },
              {
                activeOnTeams: {
                  // Don't delete reminder if user is still part of another team that is active on this workflow
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
              },
              ...(isUserMemberOfOtherTeams ? [{ isActiveOnAll: false }] : []),
            ],
          },
          ...(!isUserMemberOfOtherTeams
            ? [
                {
                  teamId: team.parentId,

                  isActiveOnAll: true,
                },
              ]
            : []),
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
    deleteAllWorkflowReminders(workflowRemindersToDelete, prisma);
  }
}
