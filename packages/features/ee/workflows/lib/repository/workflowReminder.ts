import prisma from "@calcom/prisma";
import { WorkflowMethods } from "@calcom/prisma/enums";

export class WorkflowReminderRepository {
  static getFutureScheduledSMSReminders(phoneNumber: string) {
    return prisma.workflowReminder.findMany({
      where: {
        method: WorkflowMethods.SMS,
        cancelled: null,
        scheduledDate: { gte: new Date() },
        booking: {
          smsReminderNumber: phoneNumber,
        },
      },
    });
  }

  static deleteWorkflowReminders(ids: number[]) {
    return prisma.workflowReminder.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
