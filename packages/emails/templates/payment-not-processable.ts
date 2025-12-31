import type { TFunction } from "i18next";
import { APP_NAME, COMPANY_NAME, EMAIL_FROM_NAME } from "@calcom/lib/constants";
import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type RefundNotProcessableInput = {
  language: TFunction;
  user: {
    name?: string | null;
    email: string;
  };
  attendee: {
    name: string;
    email: string;
  };
  booking: {
    title: string;
    startTime: string;
    amount: string;
    currency: string;
    paymentDate: string;
  };
};

export default class RefundNotProcessableEmail extends BaseEmail {
  refundNotProcessableInput: RefundNotProcessableInput;

  constructor(refundEvent: RefundNotProcessableInput) {
    super();
    this.name = "SEND_REFUND_NOT_PROCESSABLE_EMAIL";
    this.refundNotProcessableInput = refundEvent;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: `${this.refundNotProcessableInput.user.name} <${this.refundNotProcessableInput.user.email}>`,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: this.refundNotProcessableInput.language("refund_not_processable_subject", {
        appName: APP_NAME,
      }),
      html: await renderEmail("RefundNotProcessable", this.refundNotProcessableInput),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `
${this.refundNotProcessableInput.language("refund_not_processable_subject", { appName: APP_NAME })}
${this.refundNotProcessableInput.language("refund_not_processable_email_header")}
${this.refundNotProcessableInput.language("hi_user_name", { name: this.refundNotProcessableInput.user.name })},
${this.refundNotProcessableInput.language("refund_not_processable_body", {
  attendeeName: this.refundNotProcessableInput.attendee.name,
  bookingTitle: this.refundNotProcessableInput.booking.title,
  startTime: this.refundNotProcessableInput.booking.startTime,
})}
${this.refundNotProcessableInput.language("refund_window_exceeded", {
  amount: this.refundNotProcessableInput.booking.amount,
  currency: this.refundNotProcessableInput.booking.currency,
  paymentDate: this.refundNotProcessableInput.booking.paymentDate,
})}
${this.refundNotProcessableInput.language("refund_not_processable_action_required")}
${this.refundNotProcessableInput.language("attendee_contact_info", {
  attendeeName: this.refundNotProcessableInput.attendee.name,
  attendeeEmail: this.refundNotProcessableInput.attendee.email,
})}
${this.refundNotProcessableInput.language("need_help_contact_support")}
${this.refundNotProcessableInput.language("the_calcom_team", { companyName: COMPANY_NAME })}
`.replace(/(<([^>]+)>)/gi, "");
  }
}