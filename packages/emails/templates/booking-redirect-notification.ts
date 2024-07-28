import type { TFunction } from "next-i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export interface IBookingRedirect {
  language: TFunction;
  fromEmail: string;
  toEmail: string;
  toName: string;
  oldDates?: string;
  dates: string;
  action: "add" | "edit" | "cancel";
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
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: this.bookingRedirect.language(
        {
          add: "booking_redirect_email_subject",
          edit: "booking_redirect_edit_email_subject",
          cancel: "booking_redirect_cancel_email_subject",
        }[this.bookingRedirect.action]
      ),
      html: await renderEmail("BookingRedirectEmailNotification", {
        ...this.bookingRedirect,
      }),
      text: "",
    };
  }
}
