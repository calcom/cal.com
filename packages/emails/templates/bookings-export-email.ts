import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import type { BookingExportEmailProps } from "../src/templates/BookingExportEmail";
import BaseEmail from "./_base-email";

export default class BookingExportEmail extends BaseEmail {
  bookingExportEmailProps: BookingExportEmailProps;

  constructor(bookingExportEmailProps: BookingExportEmailProps) {
    super();
    this.bookingExportEmailProps = bookingExportEmailProps;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.bookingExportEmailProps.receiverEmail,
      subject: `Cal ID Bookings Data`,
      html: await renderEmail("BookingExportEmail", this.bookingExportEmailProps),
      text: "",
      attachments: [
        {
          filename: "data.csv",
          content: this.bookingExportEmailProps.csvContent,
          encoding: "utf-8",
        },
      ],
    };
  }
}
