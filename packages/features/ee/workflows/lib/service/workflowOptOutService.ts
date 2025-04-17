import { deleteMultipleScheduledSMS } from "../reminders/providers/twilioProvider";
import { WorkflowOptOutContactRepository } from "../repository/workflowOptOutContact";
import { WorkflowReminderRepository } from "../repository/workflowReminder";

export class WorkflowOptOutService {
  static async optOutPhoneNumber(phoneNumber: string) {
    await WorkflowOptOutContactRepository.addPhoneNumber(phoneNumber);
    // Delete scheduled workflows
    const scheduledReminders = await WorkflowReminderRepository.getFutureScheduledSMSReminders(phoneNumber);

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
}
