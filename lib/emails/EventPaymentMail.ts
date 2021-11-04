import dayjs, { Dayjs } from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { CalendarEvent } from "@lib/calendarClient";

import EventMail from "./EventMail";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

export default class EventPaymentMail extends EventMail {
  paymentLink: string;

  constructor(paymentLink: string, calEvent: CalendarEvent) {
    super(calEvent);
    this.paymentLink = paymentLink;
  }

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
      style="height: 60px; width: 60px; color: #31c48d"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <h1 style="font-weight: 500; color: #161e2e;">${this.calEvent.language("meeting_awaiting_payment")}</h1>
    <p style="color: #4b5563; margin-bottom: 30px;">${this.calEvent.language(
      "emailed_you_and_any_other_attendees"
    )}</p>
    <hr />
    <table style="border-spacing: 20px; color: #161e2e; margin-bottom: 10px;">
      <colgroup>
        <col span="1" style="width: 40%;">
        <col span="1" style="width: 60%;">
     </colgroup>
      <tr>
        <td>${this.calEvent.language("what")}</td>
        <td>${this.calEvent.type}</td>
      </tr>
      <tr>
        <td>${this.calEvent.language("when")}</td>
        <td>${this.getInviteeStart().format("dddd, LL")}<br>${this.getInviteeStart().format("h:mma")} (${
        this.calEvent.attendees[0].timeZone
      })</td>
      </tr>
      <tr>
        <td>${this.calEvent.language("who")}</td>
        <td>${this.calEvent.organizer.name}<br /><small>${this.calEvent.organizer.email}</small></td>
      </tr>
      <tr>
        <td>${this.calEvent.language("where")}</td>
        <td>${this.getLocation()}</td>
      </tr>
      <tr>
        <td>${this.calEvent.language("notes")}Notes</td>
        <td>${this.calEvent.description}</td>
      </tr>
    </table>
    ` +
      this.getAdditionalBody() +
      "<br />" +
      `
    <hr />
  </div>
  <div style="text-align: center; margin-top: 20px; color: #ccc; font-size: 12px;">
  <img style="opacity: 0.25; width: 120px;" src="https://app.cal.com/cal-logo-word.svg" alt="Cal.com Logo"></div>
</body>
  `
    );
  }

  /**
   * Adds the video call information to the mail body.
   *
   * @protected
   */
  protected getLocation(): string {
    if (this.calEvent.additionInformation?.hangoutLink) {
      return `<a href="${this.calEvent.additionInformation?.hangoutLink}">${this.calEvent.additionInformation?.hangoutLink}</a><br />`;
    }

    if (
      this.calEvent.additionInformation?.entryPoints &&
      this.calEvent.additionInformation?.entryPoints.length > 0
    ) {
      const locations = this.calEvent.additionInformation?.entryPoints
        .map((entryPoint) => {
          return `
          ${this.calEvent.language("join_by_entrypoint", { entryPoint: entryPoint.entryPointType })}: <br />
          <a href="${entryPoint.uri}">${entryPoint.label}</a> <br />
        `;
        })
        .join("<br />");

      return `${locations}`;
    }

    return this.calEvent.location ? `${this.calEvent.location}<br /><br />` : "";
  }

  protected getAdditionalBody(): string {
    return `<a href="${this.paymentLink}">${this.calEvent.language("pay_now")}</a>`;
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
      subject: this.calEvent.language("awaiting_payment", {
        eventType: this.calEvent.type,
        organizerName: this.calEvent.organizer.name,
        date: this.getInviteeStart().format("dddd, LL"),
      }),
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected printNodeMailerError(error: Error): void {
    console.error("SEND_BOOKING_PAYMENT_ERROR", this.calEvent.attendees[0].email, error);
  }

  /**
   * Returns the inviteeStart value used at multiple points.
   *
   * @private
   */
  protected getInviteeStart(): Dayjs {
    return dayjs(this.calEvent.startTime).tz(this.calEvent.attendees[0].timeZone);
  }
}
