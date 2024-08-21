import { renderEmail } from "../";
import generateIcsString from "../lib/generateIcsString";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeAddGuestsEmail extends AttendeeScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      icalEvent: {
        filename: "event.ics",
        content: generateIcsString({
          event: this.calEvent,
          title: this.t("new_guests_added"),
          subtitle: this.t("emailed_you_and_any_other_attendees"),
          role: "attendee",
          status: "CONFIRMED",
        }),
        method: "REQUEST",
      },
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.t("guests_added_event_type_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("AttendeeAddGuestsEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
      }),
      text: this.getTextBody("new_guests_added"),
    };
  }
}
