import dayjs, { Dayjs } from "dayjs";
import EventMail from "./EventMail";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

export default class EventRejectionMail extends EventMail {
  /**
   * Returns the email text as HTML representation.
   *
   * @protected
   */
  protected getHtmlRepresentation(): string {
    return (
      `
<body style="background: #f4f5f7; font-family: Helvetica, sans-serif">
  <div
    style="
      margin: 0 auto;
      max-width: 450px;
      background: white;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      padding: 2rem 2rem 2rem 2rem;
      text-align: center;
      margin-top: 40px;
    "
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style="height: 60px; width: 60px; color: #ba2525"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
         d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <h1 style="font-weight: 500; color: #161e2e;">Your meeting request has been rejected</h1>
    <p style="color: #4b5563; margin-bottom: 30px;">You and any other attendees have been emailed with this information.</p>
    <hr />
    ` +
      `
  </div>
  <div style="text-align: center; margin-top: 20px; color: #ccc; font-size: 12px;">
    <img style="opacity: 0.25; width: 120px;" src="https://app.calendso.com/calendso-logo-word.svg" alt="Calendso Logo"></div>
</body>
  `
    );
  }

  /**
   * Returns the payload object for the nodemailer.
   *
   * @protected
   */
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.calEvent.attendees[0].name} <${this.calEvent.attendees[0].email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `Rejected: ${this.calEvent.type} with ${
        this.calEvent.organizer.name
      } on ${this.getInviteeStart().format("dddd, LL")}`,
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
