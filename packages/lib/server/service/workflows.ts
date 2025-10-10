import type { ScheduleWorkflowRemindersArgs } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import { scheduleWorkflowReminders } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { Workflow } from "@calcom/ee/workflows/lib/types";
import { prisma } from "@calcom/prisma";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { WorkflowRepository } from "../repository/workflow";

// TODO (Sean): Move most of the logic migrated in 16861 to this service
export class WorkflowService {
  static _beforeAfterEventTriggers: WorkflowTriggerEvents[] = [
    WorkflowTriggerEvents.AFTER_EVENT,
    WorkflowTriggerEvents.BEFORE_EVENT,
  ];
  static async deleteWorkflowRemindersOfRemovedTeam(teamId: number) {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });

    if (team?.parentId) {
      const activeWorkflowsOnTeam = await prisma.workflow.findMany({
        where: {
          teamId: team.parentId,
          OR: [
            {
              activeOnTeams: {
                some: {
                  teamId: team.id,
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
          const allRemainingOrgTeams = await prisma.team.findMany({
            where: {
              parentId: team.parentId,
              id: {
                not: team.id,
              },
            },
          });
          remainingActiveOnIds = allRemainingOrgTeams.map((team) => team.id);
        } else {
          remainingActiveOnIds = workflow.activeOnTeams
            .filter((activeOn) => activeOn.teamId !== team.id)
            .map((activeOn) => activeOn.teamId);
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

  static async scheduleWorkflowsForNewBooking({
    isNormalBookingOrFirstRecurringSlot,
    isConfirmedByDefault,
    isRescheduleEvent,
    workflows,
    ...args
  }: ScheduleWorkflowRemindersArgs & {
    isConfirmedByDefault: boolean;
    isRescheduleEvent: boolean;
    isNormalBookingOrFirstRecurringSlot: boolean;
  }) {
    if (workflows.length <= 0) return;

    const workflowsToTrigger: Workflow[] = [];

    if (isRescheduleEvent) {
      workflowsToTrigger.push(
        ...workflows.filter(
          (workflow) =>
            workflow.trigger === WorkflowTriggerEvents.RESCHEDULE_EVENT ||
            this._beforeAfterEventTriggers.includes(workflow.trigger)
        )
      );
    } else if (!isConfirmedByDefault) {
      workflowsToTrigger.push(
        ...workflows.filter((workflow) => workflow.trigger === WorkflowTriggerEvents.BOOKING_REQUESTED)
      );
    } else if (isConfirmedByDefault) {
      workflowsToTrigger.push(
        ...workflows.filter(
          (workflow) =>
            this._beforeAfterEventTriggers.includes(workflow.trigger) ||
            (isNormalBookingOrFirstRecurringSlot && workflow.trigger === WorkflowTriggerEvents.NEW_EVENT)
        )
      );
    }

    if (workflowsToTrigger.length === 0) return;

    await scheduleWorkflowReminders({
      ...args,
      workflows: workflowsToTrigger,
    });
  }

  static async scheduleWorkflowsFilteredByTriggerEvent({
    workflows,
    triggers,
    ...args
  }: ScheduleWorkflowRemindersArgs & { triggers: WorkflowTriggerEvents[] }) {
    if (workflows.length <= 0) return;
    await scheduleWorkflowReminders({
      ...args,
      workflows: workflows.filter((workflow) => triggers.includes(workflow.trigger)),
    });
  }
}
