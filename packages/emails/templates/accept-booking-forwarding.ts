import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export interface IBookingForwarding {
  language: TFunction;
  fromEmail: string;
  toEmail: string;
  toName: string;
  acceptLink: string;
  rejectLink: string;
  dates: string;
}

export default class AcceptBookingForwarding extends BaseEmail {
  bookingForwarding: IBookingForwarding;

  constructor(bookingForwarding: IBookingForwarding) {
    super();
    this.name = "ACCEPT_BOOKING_FORWARDING";
    this.bookingForwarding = bookingForwarding;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: `${this.bookingForwarding.toEmail} <${this.bookingForwarding.toName}>`,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      subject: this.bookingForwarding.language("accept_booking_forwarding_email_subject"),
      html: await renderEmail("AcceptBookingForwardingEmail", {
        ...this.bookingForwarding,
      }),
      text: "",
    };
  }
}
