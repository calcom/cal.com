import type { WorkflowEmailData } from "@calcom/emails/templates/workflow-email";
import { sendCustomWorkflowEmail } from "@calcom/emails/workflow-email-service";
import { NotificationChannel, NotificationType } from "@calcom/features/notifications/types";
import tasker from "@calcom/features/tasker";

type EmailData = Omit<WorkflowEmailData, "to"> & {
  to: string[];
} & {
  sendAt?: Date | null;
  includeCalendarEvent?: boolean;
  referenceUid?: string;
  userId?: number | null;
  teamId?: number | null;
};

export async function sendOrScheduleWorkflowEmails(mailData: EmailData) {
  if (mailData.sendAt) {
    if (mailData.sendAt <= new Date()) return;
    const { sendAt, referenceUid, userId, teamId, ...taskerData } = mailData;
    return await tasker.create("sendWorkflowEmails", taskerData, {
      scheduledAt: sendAt,
      referenceUid,
      notificationContext:
        userId != null
          ? {
              userId,
              teamId: teamId ?? null,
              notificationType: NotificationType.WORKFLOW_EMAIL_REMINDER,
              channel: NotificationChannel.EMAIL,
            }
          : undefined,
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
