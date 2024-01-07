import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export interface IBookingRedirect {
  language: TFunction;
  fromEmail: string;
  toEmail: string;
  toName: string;
  acceptLink: string;
  rejectLink: string;
  dates: string;
}

export default class AcceptBookingRedirect extends BaseEmail {
  bookingRedirect: IBookingRedirect;

  constructor(bookingRedirect: IBookingRedirect) {
    super();
    this.name = "ACCEPT_BOOKING_REDIRECT";
    this.bookingRedirect = bookingRedirect;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: `${this.bookingRedirect.toEmail} <${this.bookingRedirect.toName}>`,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      subject: this.bookingRedirect.language("accept_booking_redirect_email_subject"),
      html: await renderEmail("AcceptBookingRedirectEmail", {
        ...this.bookingRedirect,
      }),
      text: "",
    };
  }
}
