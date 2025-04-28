import prisma from "@calcom/prisma";
import { WorkflowMethods, WorkflowActions } from "@calcom/prisma/enums";

export class WorkflowReminderRepository {
  static getFutureScheduledAttendeeSMSReminders(phoneNumber: string) {
    return prisma.workflowReminder.findMany({
      where: {
        method: WorkflowMethods.SMS,
        cancelled: null,
        scheduledDate: { gte: new Date() },
        booking: {
          smsReminderNumber: phoneNumber,
        },
        workflowStep: {
          action: WorkflowActions.SMS_ATTENDEE,
        },
      },
    });
  }

  static deleteWorkflowReminders(ids: number[]) {
    if (!ids.length) {
      return [];
    }

    return prisma.workflowReminder.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
