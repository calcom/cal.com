import { renderEmail } from "../";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeAwaitingPaymentEmail extends AttendeeScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.attendee.language.translate("awaiting_payment_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        date: `${this.getInviteeStart("h:mma")} - ${this.getInviteeEnd(
          "h:mma"
        )}, ${this.attendee.language.translate(
          this.getInviteeStart("dddd").toLowerCase()
        )}, ${this.attendee.language.translate(
          this.getInviteeStart("MMMM").toLowerCase()
        )} ${this.getInviteeStart("D")}, ${this.getInviteeStart("YYYY")}`,
      })}`,
      html: renderEmail("AttendeeAwaitingPaymentEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
        recurringEvent: this.recurringEvent,
      }),
      text: this.getTextBody("meeting_awaiting_payment"),
    };
  }
}
