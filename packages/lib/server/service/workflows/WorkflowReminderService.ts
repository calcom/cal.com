import { isFormTrigger } from "@calcom/ee/workflows/lib/actionHelperFunctions";
import type { PrismaClient } from "@calcom/prisma";
import type { WorkflowStep } from "@calcom/prisma/client";
import type { WorkflowTriggerEvents, TimeUnit } from "@calcom/prisma/enums";
import {
  deleteRemindersOfActiveOnIds,
  scheduleWorkflowNotifications,
} from "@calcom/trpc/server/routers/viewer/workflows/util";

export interface UpdateRemindersOnChangedTriggerParams {
  oldActiveOnIds: number[];
  newActiveOnIds: number[];
  steps: WorkflowStep[];
  newTrigger: WorkflowTriggerEvents;
  oldTrigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
  userId: number;
  teamId: number | null;
  isOrg: boolean;
}

export class WorkflowReminderService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Updates ALL reminders for a workflow when trigger, time, or timeUnit changes
   * This deletes all existing reminders and creates new ones
   */
  async updateRemindersOnChangedTrigger(params: UpdateRemindersOnChangedTriggerParams): Promise<void> {
    const {
      oldActiveOnIds,
      newActiveOnIds,
      steps,
      newTrigger,
      oldTrigger,
      time,
      timeUnit,
      userId,
      teamId,
      isOrg,
    } = params;

    if (!isFormTrigger(oldTrigger)) {
      // Delete all existing reminders before rescheduling
      await deleteRemindersOfActiveOnIds({ removedActiveOnIds: oldActiveOnIds, workflowSteps: steps, isOrg });
    }

    if (!isFormTrigger(newTrigger)) {
      // Schedule new reminders for all activeOn
      await scheduleWorkflowNotifications({
        activeOn: newActiveOnIds,
        isOrg,
        workflowSteps: steps,
        time,
        timeUnit,
        trigger: newTrigger,
        userId,
        teamId,
      });
    }
  }
}
