import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";

import { WorkflowReminderRepository } from "../../repositories/WorkflowReminderRepository";
import { deleteMultipleScheduledSMS } from "../reminders/providers/twilioProvider";
import { WorkflowOptOutContactRepository } from "../repository/workflowOptOutContact";

export class WorkflowOptOutService {
  static async optOutPhoneNumber(phoneNumber: string) {
    await WorkflowOptOutContactRepository.addPhoneNumber(phoneNumber);
    // Delete scheduled workflows
    const workflowReminderRepository = new WorkflowReminderRepository(prisma);
    const scheduledReminders = await workflowReminderRepository.findScheduledSMSByPhoneNumber(phoneNumber);

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
