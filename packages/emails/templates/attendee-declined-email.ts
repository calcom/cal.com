import { renderEmail } from "../";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeDeclinedEmail extends AttendeeScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.t("event_declined_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("AttendeeDeclinedEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
      }),
      text: this.getTextBody(
        this.calEvent.recurringEvent?.count ? "event_request_declined_recurring" : "event_request_declined"
      ),
    };
  }
}
