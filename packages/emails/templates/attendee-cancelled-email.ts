import { renderEmail } from "../";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeCancelledEmail extends AttendeeScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.t("event_cancelled_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("AttendeeCancelledEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
      }),
      text: this.getTextBody("event_request_cancelled", "emailed_you_and_any_other_attendees"),
    };
  }
}
