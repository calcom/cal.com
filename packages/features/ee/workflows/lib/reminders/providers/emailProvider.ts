import { sendWorkflowEmail } from "@calcom/emails";

import { sendSendgridMail } from "./sendgridProvider";

export type Attachment = {
  key: string;
  field: string;
  [key: string]: any;
};

export type EmailData = {
  to: string;
  fromName: string;
  subject: string;
  emailBody: string;
  replyTo: string;
  sender?: string | null;
  includeCalendarEvent?: boolean;
  attachments?: Attachment[];
};

export function sendOrScheduleWorkflowEmail(mailData: EmailData) {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_EMAIL) {
    sendSendgridMail(mailData);
    return;
  }

  if (mailData.sendAt) {
    // schedule email with tasker
  } else {
    sendWorkflowEmail({
      to: mailData.to,
      subject: mailData.subject,
      emailBody: addHTMLStyles(mailData.emailBody),
      senderName: mailData.sender,
      replyTo: mailData.replyTo,
      attachments: mailData.attachments,
    });
  }
}

export function addHTMLStyles(html?: string) {
  if (!html) {
    return "";
  }
  const dom = new JSDOM(html);
  // Select all <a> tags inside <h6> elements --> only used for emojis in rating template
  const links = Array.from(dom.window.document.querySelectorAll("h6 a")).map((link) => link as HTMLElement);

  links.forEach((link) => {
    link.style.fontSize = "20px";
    link.style.textDecoration = "none";
  });

  return dom.serialize();
}
