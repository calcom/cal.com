import dayjs, {Dayjs} from "dayjs";
import EventMail from "./EventMail";

import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

export default class EventAttendeeMail extends EventMail {
  /**
   * Returns the email text as HTML representation.
   *
   * @protected
   */
  protected getHtmlRepresentation(): string {
    return `
    <div>
      Hi ${this.calEvent.attendees[0].name},<br />
      <br />
      Your ${this.calEvent.type} with ${this.calEvent.organizer.name} at ${this.getInviteeStart().format('h:mma')} 
      (${this.calEvent.attendees[0].timeZone}) on ${this.getInviteeStart().format('dddd, LL')} is scheduled.<br />
      <br />` + this.getAdditionalBody() + (
        this.calEvent.location ? `<strong>Location:</strong> ${this.calEvent.location}<br /><br />` : ''
      ) +
      `<strong>Additional notes:</strong><br />
      ${this.calEvent.description}<br />
      ` + this.getAdditionalFooter() + `
    </div>
  `;
  }

  /**
   * Returns the payload object for the nodemailer.
   *
   * @protected
   */
  protected getNodeMailerPayload(): Object {
    return {
      to: `${this.calEvent.attendees[0].name} <${this.calEvent.attendees[0].email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `Confirmed: ${this.calEvent.type} with ${this.calEvent.organizer.name} on ${this.getInviteeStart().format('dddd, LL')}`,
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected printNodeMailerError(error: string): void {
    console.error("SEND_BOOKING_CONFIRMATION_ERROR", this.calEvent.attendees[0].email, error);
  }

  /**
   * Returns the inviteeStart value used at multiple points.
   *
   * @private
   */
  protected getInviteeStart(): Dayjs {
    return <Dayjs>dayjs(this.calEvent.startTime).tz(this.calEvent.attendees[0].timeZone);
  }
}