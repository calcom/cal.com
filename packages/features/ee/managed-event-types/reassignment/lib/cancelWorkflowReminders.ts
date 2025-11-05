import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums"; 

const workflowLogger = logger.getSubLogger({ prefix: ["managedEventWorkflowsCancellation"] });

export async function cancelOldBookingWorkflowReminders({
  bookingUid,
}: {
  bookingUid: string;
}) {
  workflowLogger.info(`Cancelling workflow reminders for booking ${bookingUid}`);

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

export async function cancelOldBookingSMSReminders({
  bookingUid,
}: {
  bookingUid: string;
}) {
  workflowLogger.info(`Cancelling SMS reminders for booking ${bookingUid}`);

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


export async function cancelWorkflowRemindersForReassignment({
  bookingUid,
}: {
  bookingUid: string;
}) {
  const [emailResult, smsResult] = await Promise.all([
    cancelOldBookingWorkflowReminders({ bookingUid }),
    cancelOldBookingSMSReminders({ bookingUid }),
  ]);

  return {
    totalCancelled: emailResult.cancelledCount + smsResult.cancelledCount,
    emailCancelled: emailResult.cancelledCount,
    smsCancelled: smsResult.cancelledCount,
  };
}

