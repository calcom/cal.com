import { getTranslation } from "@calcom/lib/server/i18n";

import { deleteMultipleScheduledSMS } from "../reminders/providers/twilioProvider";
import { WorkflowOptOutContactRepository } from "../repository/workflowOptOutContact";
import { WorkflowReminderRepository } from "../repository/workflowReminder";

export class WorkflowOptOutService {
  static async optOutPhoneNumber(phoneNumber: string) {
    await WorkflowOptOutContactRepository.addPhoneNumber(phoneNumber);
    // Delete scheduled workflows
    const scheduledReminders = await WorkflowReminderRepository.getFutureScheduledAttendeeSMSReminders(
      phoneNumber
    );

    // Get twilio scheduled workflows reminders
    await deleteMultipleScheduledSMS(
      scheduledReminders
        .filter((reminder) => !!reminder.referenceId)
        .map((reminder) => reminder.referenceId as string)
    );

    // Get not twilio scheduled yet workflows
    await WorkflowReminderRepository.deleteWorkflowReminders(
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
