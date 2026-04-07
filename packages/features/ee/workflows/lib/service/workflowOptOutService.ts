import { getTranslation } from "@calcom/i18n/server";
import prisma from "@calcom/prisma";

import { WorkflowReminderRepository } from "../../repositories/workflow-reminder-repository";
import { deleteMultipleScheduledSMS } from "../reminders/providers/twilioProvider";
import { WorkflowOptOutContactRepository } from "../repository/workflowOptOutContact";

export class WorkflowOptOutService {
  static async optOutPhoneNumber(phoneNumber: string) {
    await WorkflowOptOutContactRepository.addPhoneNumber(phoneNumber);

    const workflowReminderRepository = new WorkflowReminderRepository(prisma);

    // Delete scheduled workflows
    const scheduledReminders =
      await workflowReminderRepository.findFutureScheduledAttendeeSMSReminders(phoneNumber);

    // Get twilio scheduled workflows reminders
    await deleteMultipleScheduledSMS(
      scheduledReminders
        .filter((reminder) => !!reminder.referenceId)
        .map((reminder) => reminder.referenceId as string)
    );

    // Get not twilio scheduled yet workflows
    await workflowReminderRepository.deleteMany(
      scheduledReminders.filter((reminder) => !reminder.referenceId).map((reminder) => reminder.id)
    );
  }

  static async addOptOutMessage(message: string, locale: string) {
    if (process.env.TWILIO_OPT_OUT_ENABLED === "true") {
      const t = await getTranslation(locale, "common");
      return `${message}\n\n${t("sms_opt_out_message")}`;
    }

    return message;
  }
}
