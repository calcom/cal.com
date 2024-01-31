import { renderEmail } from "../";
import generateIcsString from "../lib/generateIcsString";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeCancelledEmail extends AttendeeScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      icalEvent: {
        filename: "event.ics",
        content: generateIcsString({
          event: this.calEvent,
          title: this.t("event_request_cancelled"),
          subtitle: this.t("emailed_you_and_any_other_attendees"),
          status: "CANCELLED",
          role: "attendee",
        }),
        method: "REQUEST",
      },
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.t("event_cancelled_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("AttendeeCancelledEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
      }),
      text: this.getTextBody("event_request_cancelled", "emailed_you_and_any_other_attendees"),
    };
  }
}
