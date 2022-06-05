import { renderEmail } from "../";

import BaseEmail from "./_base-email";

export interface Feedback {
  userId: number;
  rating: string;
  comment: string;
}

export default class FeedbackEmail extends BaseEmail {
  feedback: Feedback;

  constructor(feedback: Feedback) {
    super();
    this.feedback = feedback;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: process.env.SEND_FEEDBACK_EMAIL,
      subject: `User Feedback`,
      html: renderEmail("FeedbackEmail", this.feedback),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `
User id: ${this.feedback.userId}
Rating: ${this.feedback.rating}
Comment: ${this.feedback.comment}
    `;
  }
}
