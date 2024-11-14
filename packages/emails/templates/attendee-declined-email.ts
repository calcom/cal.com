import type { CalendarEvent, Person } from "@calcom/types/Calendar";

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
      html: await this.getHtml(this.calEvent, this.attendee),
      text: this.getTextBody(
        this.calEvent.recurringEvent?.count ? "event_request_declined_recurring" : "event_request_declined"
      ),
    };
  }

  protected async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail("AttendeeDeclinedEmail", {
      calEvent,
      attendee,
    });
  }
}
