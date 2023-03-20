import { renderEmail } from "../";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeAwaitingPaymentEmail extends AttendeeScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.attendee.language.translate("awaiting_payment_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("AttendeeAwaitingPaymentEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
      }),
      text: this.getTextBody("meeting_awaiting_payment"),
    };
  }
}
