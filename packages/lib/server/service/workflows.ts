import { prisma } from "@calcom/prisma";

import { WorkflowRepository } from "../repository/workflow";

// TODO (Sean): Move most of the logic migrated in 16861 to this service
export class WorkflowService {
  static async deleteWorkflowRemindersOfRemovedTeam(teamId: number) {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });

    if (team?.parentId) {
      const activeWorkflowsOnTeam = await prisma.calIdWorkflow.findMany({
        where: {
          calIdTeamId: team.parentId,
          OR: [
            {
              activeOnTeams: {
                some: {
                  calIdTeamId: team.id,
                },
              },
            },
            {
              isActiveOnAll: true,
            },
          ],
        },
        select: {
          steps: true,
          activeOnTeams: true,
          isActiveOnAll: true,
        },
      });

      for (const workflow of activeWorkflowsOnTeam) {
        const workflowSteps = workflow.steps;
        let remainingActiveOnIds = [];

        if (workflow.isActiveOnAll) {
          const allRemainingOrgTeams = await prisma.calIdTeam.findMany({
            where: {
              // parentId: team.parentId,
              id: {
                not: team.id,
              },
            },
          });
          remainingActiveOnIds = allRemainingOrgTeams.map((team) => team.id);
        } else {
          remainingActiveOnIds = workflow.activeOnTeams
            .filter((activeOn) => activeOn.calIdTeamId !== team.id)
            .map((activeOn) => activeOn.calIdTeamId);
        }
        const remindersToDelete = await WorkflowRepository.getRemindersFromRemovedTeams(
          [team.id],
          workflowSteps,
          remainingActiveOnIds
        );
        await WorkflowRepository.deleteAllWorkflowReminders(remindersToDelete);
      }
    }
  }
}
