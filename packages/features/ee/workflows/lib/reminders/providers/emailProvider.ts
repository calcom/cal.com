import { sendCustomWorkflowEmail } from "@calcom/emails";
import type { WorkflowEmailData } from "@calcom/emails/templates/workflow-email";
import tasker from "@calcom/features/tasker";

type EmailData = WorkflowEmailData & { sendAt?: Date; includeCalendarEvent?: boolean };

export async function sendOrScheduleWorkflowEmail(mailData: EmailData) {
  if (mailData.sendAt) {
    await tasker.create("scheduleWorkflowEmail", mailData, { scheduledAt: mailData.sendAt });
  } else {
    sendCustomWorkflowEmail({
      to: mailData.to,
      subject: mailData.subject,
      html: mailData.html,
      sender: mailData.sender,
      replyTo: mailData.replyTo,
      attachments: mailData.attachments,
    });
  }
}
