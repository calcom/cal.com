import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import logger from "@calcom/lib/logger";
import type { WorkflowReminder } from "@calcom/prisma/client";

const workflowLogger = logger.getSubLogger({ prefix: ["managedEventWorkflowsCancellation"] });

export async function cancelWorkflowRemindersForReassignment({
  workflowReminders,
}: {
  workflowReminders: WorkflowReminder[];
}) {
  workflowLogger.info(`Cancelling ${workflowReminders.length} workflow reminders`);

  // Use the standard WorkflowRepository method (same as reschedule and cancel)
  await WorkflowRepository.deleteAllWorkflowReminders(workflowReminders);

  workflowLogger.info(`Cancelled ${workflowReminders.length} workflow reminders`);

  return {
    cancelledCount: workflowReminders.length,
  };
}

