import dayjs, { Dayjs } from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";
import { createEvent } from "ics";

import { Person } from "@lib/calendarClient";

import EventMail from "./EventMail";
import { stripHtml } from "./helpers";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(toArray);
dayjs.extend(localizedFormat);

export default class EventOrganizerMail extends EventMail {
  /**
   * Returns the instance's event as an iCal event in string representation.
   * @protected
   */
  protected getiCalEventAsString(): string | undefined {
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)),
      startInputType: "utc",
      productId: "calendso/ics",
      title: this.calEvent.language("organizer_ics_event_title", {
        eventType: this.calEvent.type,
        attendeeName: this.calEvent.attendees[0].name,
      }),
      description:
        this.calEvent.description +
        stripHtml(this.getAdditionalBody()) +
        stripHtml(this.getAdditionalFooter()),
      duration: { minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), "minute") },
      organizer: { name: this.calEvent.organizer.name, email: this.calEvent.organizer.email },
      attendees: this.calEvent.attendees.map((attendee: Person) => ({
        name: attendee.name,
        email: attendee.email,
      })),
      status: "CONFIRMED",
    });
    if (icsEvent.error) {
      throw icsEvent.error;
    }
    return icsEvent.value;
  }

  protected getBodyHeader(): string {
    return this.calEvent.language("new_event_scheduled");
  }

  protected getAdditionalFooter(): string {
    return `<p style="color: #4b5563; margin-top: 20px;">${this.calEvent.language(
      "need_to_make_a_change"
    )} <a href=${process.env.BASE_URL + "/bookings"} style="color: #161e2e;">${this.calEvent.language(
      "manage_my_bookings"
    )}</a></p>`;
  }

  protected getImage(): string {
    return `<svg
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
    </svg>`;
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
    ${this.getImage()}
    <h1 style="font-weight: 500; color: #161e2e;">${this.getBodyHeader()}</h1>
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
        <td>${this.getOrganizerStart().format("dddd, LL")}<br>${this.getOrganizerStart().format("h:mma")} (${
        this.calEvent.organizer.timeZone
      })</td>
      </tr>
      <tr>
        <td>${this.calEvent.language("who")}</td>
        <td>${this.calEvent.attendees[0].name}<br /><small><a href="mailto:${
        this.calEvent.attendees[0].email
      }">${this.calEvent.attendees[0].email}</a></small></td>
      </tr>
      <tr>
        <td>${this.calEvent.language("where")}</td>
        <td>${this.getLocation()}</td>
      </tr>
      <tr>
        <td>${this.calEvent.language("notes")}</td>
        <td>${this.calEvent.description}</td>
      </tr>
    </table>
    ` +
      this.getAdditionalBody() +
      "<br />" +
      `
    <hr />
    ` +
      this.getAdditionalFooter() +
      `
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
    return ``;
  }
  /**
   * Returns the payload object for the nodemailer.
   *
   * @protected
   */
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.calEvent.organizer.email];
    if (this.calEvent.team) {
      this.calEvent.team.members.forEach((member) => {
        const memberAttendee = this.calEvent.attendees.find((attendee) => attendee.name === member);
        if (memberAttendee) {
          toAddresses.push(memberAttendee.email);
        }
      });
    }

    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: this.getSubject(),
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected getSubject(): string {
    return this.calEvent.language("new_event_subject", {
      attendeeName: this.calEvent.attendees[0].name,
      date: this.getOrganizerStart().format("LT dddd, LL"),
      eventType: this.calEvent.type,
    });
  }

  protected printNodeMailerError(error: Error): void {
    console.error("SEND_NEW_EVENT_NOTIFICATION_ERROR", this.calEvent.organizer.email, error);
  }

  /**
   * Returns the organizerStart value used at multiple points.
   *
   * @private
   */
  protected getOrganizerStart(): Dayjs {
    return dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);
  }
}
