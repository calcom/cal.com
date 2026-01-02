import { APP_NAME, COMPANY_NAME, EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export function formatInTimeZone(
  utcDate: string | Date,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(new Date(utcDate));
}

export type PaymentNotProcessableInput = {
  user: {
    name?: string | null;
    email: string;
    timeZone: string;
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
    paymentId: string;
  };
};

export default class PaymentNotProcessableEmail extends BaseEmail {
  paymentNotProcessableInput: PaymentNotProcessableInput;

  constructor(paymentEvent: PaymentNotProcessableInput) {
    super();
    this.name = "SEND_PAYMENT_NOT_PROCESSABLE_EMAIL";
    this.paymentNotProcessableInput = paymentEvent;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const { user, attendee, booking } = this.paymentNotProcessableInput;

    const subject = `Refund Could Not Be Processed - ${APP_NAME}`;

    const payload = {
      to: `${user.name ?? ""} <${user.email}>`,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject,
      html: await renderEmail("PaymentNotProcessableEmail", {
        user,
        attendee,
        booking,
      }),
      text: this.getTextBody(),
    };

    console.log("Processing payment not processable email payload", payload);

    return payload;
  }

  protected getTextBody(): string {
    const { user, attendee, booking } = this.paymentNotProcessableInput;

    const startTime = formatInTimeZone(booking.startTime, user.timeZone);

    const paymentDate = formatInTimeZone(booking.paymentDate, user.timeZone, { timeStyle: undefined });

    return `
Refund Could Not Be Processed - ${APP_NAME}

Hi ${user.name ?? ""},

${attendee.name} has cancelled their booking for "${
      booking.title
    }" scheduled for ${startTime}. However, we were unable to process the refund automatically.

The refund amount of ${booking.amount} ${booking.currency} cannot be processed because the payment '${
      booking.paymentId
    }' was made on ${paymentDate}, which exceeds the 6-month refund window required by our payment processor.

To resolve this matter, you may need to issue a manual refund directly to the attendee or discuss alternative arrangements.

Attendee Contact Information:
Name: ${attendee.name}
Email: ${attendee.email}

If you need assistance or have questions about this cancellation, please contact our support team.

The ${COMPANY_NAME} Team
`.trim();
  }
}
