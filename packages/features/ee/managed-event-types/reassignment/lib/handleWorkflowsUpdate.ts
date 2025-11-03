import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums"; 

const workflowLogger = logger.getSubLogger({ prefix: ["managedEventWorkflowsUpdate"] });

/**
 * Handles workflow reminder updates for managed event reassignment
 * 
 * Since managed events create a NEW booking (not in-place update), we need to:
 * 1. Cancel all scheduled workflow reminders for the OLD booking
 * 2. NEW booking reminders are handled separately via WorkflowService.scheduleWorkflowsForNewBooking
 */
export async function cancelOldBookingWorkflowReminders({
  bookingUid,
  _orgId,
}: {
  bookingUid: string;
  _orgId: number | null;
}) {
  workflowLogger.info(`Cancelling workflow reminders for booking ${bookingUid}`);

  // Find all scheduled EMAIL workflow reminders for the old booking
  const workflowReminders = await prisma.workflowReminder.findMany({
    where: {
      bookingUid,
      method: WorkflowMethods.EMAIL,
      scheduled: true,
      OR: [{ cancelled: false }, { cancelled: null }],
      workflowStep: {
        action: {
          in: [
            WorkflowActions.EMAIL_HOST,
            WorkflowActions.EMAIL_ATTENDEE,
            WorkflowActions.EMAIL_ADDRESS,
          ],
        },
        workflow: {
          trigger: {
            in: [
              WorkflowTriggerEvents.BEFORE_EVENT,
              WorkflowTriggerEvents.NEW_EVENT,
              WorkflowTriggerEvents.AFTER_EVENT,
            ],
          },
        },
      },
    },
    select: {
      id: true,
      referenceId: true,
      workflowStep: {
        select: {
          action: true,
          workflow: {
            select: {
              trigger: true,
            },
          },
        },
      },
    },
  });

  workflowLogger.info(`Found ${workflowReminders.length} workflow reminders to cancel`);

  // Delete all scheduled reminders
  const deletionPromises = workflowReminders.map((reminder) =>
    deleteScheduledEmailReminder(reminder.id).catch((error) => {
      workflowLogger.error(`Failed to delete reminder ${reminder.id}`, error);
    })
  );

  await Promise.all(deletionPromises);

  workflowLogger.info(`Cancelled ${workflowReminders.length} workflow reminders`);

  return {
    cancelledCount: workflowReminders.length,
  };
}

/**
 * Cancels SMS workflow reminders for the old booking
 * 
 * Note: SMS reminders are handled differently from email reminders
 */
export async function cancelOldBookingSMSReminders({
  bookingUid,
}: {
  bookingUid: string;
}) {
  workflowLogger.info(`Cancelling SMS reminders for booking ${bookingUid}`);

  // Mark SMS reminders as cancelled in the database
  const result = await prisma.workflowReminder.updateMany({
    where: {
      bookingUid,
      method: {
        in: [WorkflowMethods.SMS, WorkflowMethods.WHATSAPP],
      },
      scheduled: true,
      OR: [{ cancelled: false }, { cancelled: null }],
    },
    data: {
      cancelled: true,
    },
  });

  workflowLogger.info(`Cancelled ${result.count} SMS/WhatsApp reminders`);

  return {
    cancelledCount: result.count,
  };
}

/**
 * Main function to cancel all workflow reminders for a reassigned booking
 */
export async function cancelAllWorkflowRemindersForReassignment({
  bookingUid,
  _orgId,
}: {
  bookingUid: string;
  _orgId: number | null;
}) {
  const [emailResult, smsResult] = await Promise.all([
    cancelOldBookingWorkflowReminders({ bookingUid, _orgId }),
    cancelOldBookingSMSReminders({ bookingUid }),
  ]);

  return {
    totalCancelled: emailResult.cancelledCount + smsResult.cancelledCount,
    emailCancelled: emailResult.cancelledCount,
    smsCancelled: smsResult.cancelledCount,
  };
}

