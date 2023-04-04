import { renderEmail } from "../";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class NoShowFeeChargedEmail extends AttendeeScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    if (!this.calEvent.paymentInfo?.amount) throw new Error("No payment into");
    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.attendee.language.translate("no_show_fee_charged_email_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
        amount: this.calEvent.paymentInfo.amount / 100,
        formatParams: { amount: { currency: this.calEvent.paymentInfo?.currency } },
      })}`,
      html: renderEmail("NoShowFeeChargedEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
      }),
      text: this.getTextBody("no_show_fee_charged_text_body"),
    };
  }
}
