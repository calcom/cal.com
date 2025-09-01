import { sendCustomWorkflowEmail } from "@calcom/emails";
import type { WorkflowEmailData } from "@calcom/emails/templates/workflow-email";
import { createSendWorkflowEmailsTask } from "@calcom/features/tasker/tasks/createSendWorkflowEmailsTask";

type EmailData = Omit<WorkflowEmailData, "to"> & {
  to: string[];
} & { sendAt?: Date; includeCalendarEvent?: boolean; referenceUid?: string };

export async function sendOrScheduleWorkflowEmails(mailData: EmailData) {
  if (mailData.sendAt) {
    if (mailData.sendAt <= new Date()) return;
    const { sendAt, referenceUid, ...taskerData } = mailData;
    return await createSendWorkflowEmailsTask(taskerData, {
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
