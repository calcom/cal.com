import { renderEmail } from "@calcom/emails";

import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeDeclinedEmail extends AttendeeScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.t("event_declined_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        date: `${this.getInviteeStart("h:mma")} - ${this.getInviteeEnd("h:mma")}, ${this.t(
          this.getInviteeStart("dddd").toLowerCase()
        )}, ${this.t(this.getInviteeStart("MMMM").toLowerCase())} ${this.getInviteeStart("D, YYYY")}`,
      })}`,
      html: renderEmail("AttendeeDeclinedEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
        recurringEvent: this.recurringEvent,
      }),
      text: this.getTextBody(
        this.recurringEvent?.count ? "event_request_declined_recurring" : "event_request_declined"
      ),
    };
  }
}
