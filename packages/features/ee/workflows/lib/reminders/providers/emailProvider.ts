import { sendCustomWorkflowEmail } from "@calcom/emails";
import type { WorkflowEmailData } from "@calcom/emails/templates/workflow-email";
import tasker from "@calcom/features/tasker";

type EmailData = Omit<WorkflowEmailData, "to"> & {
  to: string[];
} & { sendAt?: Date; includeCalendarEvent?: boolean; referenceUid?: string };

export async function sendOrScheduleWorkflowEmails(mailData: EmailData) {
  if (mailData.sendAt) {
    const { sendAt, referenceUid, ...taskerData } = mailData;
    return await tasker.create("sendWorkflowEmails", taskerData, {
      scheduledAt: sendAt,
      referenceUid,
    });
  } else {
    await Promise.all(
      mailData.to.map((to) =>
        sendCustomWorkflowEmail({
          to,
          subject: mailData.subject,
          html: mailData.html,
          sender: mailData.sender,
          replyTo: mailData.replyTo,
          attachments: mailData.attachments,
        })
      )
    );
  }
}
