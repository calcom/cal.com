import { renderEmail } from "../";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeRescheduledEmail extends AttendeeScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.attendee.language.translate("rescheduled_event_type_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("AttendeeCancelledEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
        recurringEvent: this.recurringEvent,
      }),
      text: this.getTextBody("event_has_been_rescheduled", "emailed_you_and_any_other_attendees"),
    };
  }
}
