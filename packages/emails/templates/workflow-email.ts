import BaseEmail from "./_base-email";

type Attachment = {
  key: string;
  field: string;
  [key: string]: any;
};

export type WorkflowEmailDataType = {
  to: string;
  subject: string;
  emailBody: string;
  senderName?: string | null;
  replyTo: string;
  attachments?: Attachment[];
};

export default class WorkflowEmail extends BaseEmail {
  mailData: WorkflowEmailDataType;

  constructor(mailData: WorkflowEmailDataType) {
    super();
    this.mailData = mailData;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: this.mailData.to,
      from: `${this.mailData.senderName} <${this.getMailerOptions().from}>`,
      replyTo: this.mailData.replyTo,
      subject: this.mailData.subject,
      html: this.mailData.emailBody,
      attachments: this.mailData.attachments,
    };
  }
}
