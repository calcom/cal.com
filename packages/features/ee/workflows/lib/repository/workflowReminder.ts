import prisma from "@calcom/prisma";
import { WorkflowMethods } from "@calcom/prisma/enums";

export class WorkflowReminderRepository {
  static getFutureScheduledSMSReminders(phoneNumber: string) {
    return prisma.workflowReminder.findMany({
      where: {
        method: WorkflowMethods.SMS,
        sendTo: phoneNumber,
        cancelled: null,
        scheduledDate: { gte: new Date() },
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
