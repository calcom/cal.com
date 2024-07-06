import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export interface IBookingRedirect {
  language: TFunction;
  fromEmail: string;
  toEmail: string;
  toName: string;
  dates: string;
}

export default class BookingRedirectNotification extends BaseEmail {
  bookingRedirect: IBookingRedirect;

  constructor(bookingRedirect: IBookingRedirect) {
    super();
    this.name = "BOOKING_REDIRECT_NOTIFICATION";
    this.bookingRedirect = bookingRedirect;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: `${this.bookingRedirect.toName} <${this.bookingRedirect.toEmail}>`,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      subject: this.bookingRedirect.language("booking_redirect_email_subject"),
      html: await renderEmail("BookingRedirectEmailNotification", {
        ...this.bookingRedirect,
      }),
      text: "",
    };
  }
}
