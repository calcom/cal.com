import { getReplyToHeader } from "@calcom/lib/getReplyToHeader";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import renderEmail from "../src/renderEmail";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeCancelledSeatEmail extends AttendeeScheduledEmail {
  private isCancelledByHost?: boolean;

  constructor(calEvent: CalendarEvent, attendee: Person, isCancelledByHost?: boolean) {
    super(calEvent, attendee);
    this.isCancelledByHost = isCancelledByHost;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const subjectKey = this.isCancelledByHost
      ? "event_cancelled_subject"
      : "event_no_longer_attending_subject";

    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      ...getReplyToHeader(this.calEvent),
      subject: `${this.t(subjectKey, {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("AttendeeCancelledSeatEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
        isCancelledByHost: this.isCancelledByHost,
      }),
      text: this.getTextBody("event_request_cancelled", "emailed_you_and_any_other_attendees"),
    };
  }
}
