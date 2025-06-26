import { JSDOM } from "jsdom";

import { SENDER_NAME } from "@calcom/lib/constants";

import BaseEmail from "./_base-email";

export type Attachment = {
  content: string;
  filename: string;
  [key: string]: any;
};

export type WorkflowEmailData = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  sender?: string | null;
  attachments?: Attachment[];
};

export default class WorkflowEmail extends BaseEmail {
  mailData: WorkflowEmailData;

  constructor(mailData: WorkflowEmailData) {
    super();
    this.mailData = mailData;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: this.mailData.to,
      from: `${this.mailData.sender || SENDER_NAME} <${this.getMailerOptions().from}>`,
      ...(this.mailData.replyTo && { replyTo: this.mailData.replyTo }),
      subject: this.mailData.subject,
      html: addHTMLStyles(this.mailData.html),
      attachments: this.mailData.attachments,
    };
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
