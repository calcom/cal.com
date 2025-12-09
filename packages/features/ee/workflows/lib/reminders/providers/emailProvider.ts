import type { WorkflowEmailData } from "@calcom/emails/templates/workflow-email";
import { sendCustomWorkflowEmail } from "@calcom/emails/workflow-email-service";
import { createPreferenceTasker } from "@calcom/features/notifications/di";
import tasker from "@calcom/features/tasker";

type EmailData = Omit<WorkflowEmailData, "to"> & {
  to: string[];
} & {
  sendAt?: Date | null;
  includeCalendarEvent?: boolean;
  referenceUid?: string;
  notificationContext?: { userId?: number | null; teamId?: number | null };
};

export async function sendOrScheduleWorkflowEmails(mailData: EmailData) {
  if (mailData.sendAt) {
    if (mailData.sendAt <= new Date()) return;
    const { sendAt, referenceUid, notificationContext, ...taskerData } = mailData;
    const proxiedTasker = await createPreferenceTasker(tasker);
    return await proxiedTasker.create("sendWorkflowEmails", taskerData, {
      scheduledAt: sendAt,
      referenceUid,
      notificationContext,
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
