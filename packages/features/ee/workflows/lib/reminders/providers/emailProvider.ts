import type { MailData } from "@sendgrid/helpers/classes/mail";

import { sendSendgridMail } from "./sendgridProvider";

export function sendWorkflowEmail(
  mailData: Partial<MailData>,
  addData: { sender?: string | null; includeCalendarEvent?: boolean }
) {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_EMAIL) {
    sendSendgridMail(mailData, addData);
    return;
  }

  if (mailData.sendAt) {
    // schedule email with tasker
  } else {
    // sendWorkflowEmail({subject, emailBody, to, senderName: addData.sender || SENDER_NAME, replyTo, attachments})
  }
}
