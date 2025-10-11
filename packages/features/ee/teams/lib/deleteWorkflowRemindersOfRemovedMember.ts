import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import prisma from "@calcom/prisma";

// cancel/delete all workflowReminders of the removed member that come from that team (org teams only)
export async function deleteWorkfowRemindersOfRemovedMember(
  team: {
    id: number;
    parentId?: number | null;
  },
  memberId: number,
  isOrg: boolean
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
    await WorkflowRepository.deleteAllWorkflowReminders(workflowRemindersToDelete);
  } else {
    if (!team.parentId) return;

    // member was removed from an org subteam
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
              // only if workflow is not active on all team and user event types
              { isActiveOnAll: false },
            ],
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
    await WorkflowRepository.deleteAllWorkflowReminders(workflowRemindersToDelete);
  }
}
