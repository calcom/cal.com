import { sendCustomWorkflowEmail } from "@calcom/emails";
import type { WorkflowEmailData } from "@calcom/emails/templates/workflow-email";
import tasker from "@calcom/features/tasker";

type EmailData = WorkflowEmailData & { sendAt?: Date; includeCalendarEvent?: boolean };

export async function sendOrScheduleWorkflowEmail(mailData: EmailData) {
  if (mailData.sendAt) {
    const {sendAt, ...taskerData} = mailData;
    await tasker.create("sendWorkflowEmail", taskerData, { scheduledAt: sendAt });
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
