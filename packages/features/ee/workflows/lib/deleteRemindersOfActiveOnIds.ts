import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { prisma } from "@calcom/prisma";
import type { Prisma, WorkflowStep } from "@calcom/prisma/client";

async function getRemindersFromRemovedEventTypes(removedEventTypes: number[], workflowSteps: WorkflowStep[]) {
  const remindersToDeletePromise: Prisma.PrismaPromise<
    {
      id: number;
      referenceId: string | null;
      method: string;
    }[]
  >[] = [];
  removedEventTypes.forEach((eventTypeId) => {
    const remindersToDelete = prisma.workflowReminder.findMany({
      where: {
        booking: {
          eventTypeId,
        },
        workflowStepId: {
          in: workflowSteps.map((step) => {
            return step.id;
          }),
        },
      },
      select: {
        id: true,
        referenceId: true,
        method: true,
      },
    });

    remindersToDeletePromise.push(remindersToDelete);
  });

  const remindersToDelete = (await Promise.all(remindersToDeletePromise)).flat();
  return remindersToDelete;
}

export async function deleteRemindersOfActiveOnIds({
  removedActiveOnIds,
  workflowSteps,
  isOrg,
  activeOnIds,
}: {
  removedActiveOnIds: number[];
  workflowSteps: WorkflowStep[];
  isOrg: boolean;
  activeOnIds?: number[];
}) {
  const remindersToDelete = !isOrg
    ? await getRemindersFromRemovedEventTypes(removedActiveOnIds, workflowSteps)
    : await WorkflowRepository.getRemindersFromRemovedTeams(removedActiveOnIds, workflowSteps, activeOnIds);
  await WorkflowRepository.deleteAllWorkflowReminders(remindersToDelete);
}
