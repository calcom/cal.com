import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeRequestEmail extends AttendeeScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = this.calEvent.attendees.map((attendee) => attendee.email);

    return {
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      replyTo: [...this.calEvent.attendees.map(({ email }) => email), this.calEvent.organizer.email],
      subject: `${this.calEvent.attendees[0].language.translate("booking_submitted_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("AttendeeRequestEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
      }),
      text: this.getTextBody(
        this.calEvent.attendees[0].language.translate("booking_submitted", {
          name: this.calEvent.attendees[0].name,
        }),
        this.calEvent.attendees[0].language.translate("user_needs_to_confirm_or_reject_booking", {
          user: this.calEvent.organizer.name,
        })
      ),
    };
  }
}
