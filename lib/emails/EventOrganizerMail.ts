import { createEvent } from "ics";
import dayjs, { Dayjs } from "dayjs";
import EventMail from "./EventMail";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import localizedFormat from "dayjs/plugin/localizedFormat";
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
  protected getiCalEventAsString(): string {
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)),
      startInputType: "utc",
      productId: "calendso/ics",
      title: `${this.calEvent.type} with ${this.calEvent.attendees[0].name}`,
      description:
        this.calEvent.description +
        stripHtml(this.getAdditionalBody()) +
        stripHtml(this.getAdditionalFooter()),
      duration: { minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), "minute") },
      organizer: { name: this.calEvent.organizer.name, email: this.calEvent.organizer.email },
      attendees: this.calEvent.attendees.map((attendee: unknown) => ({
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

  /**
   * Returns the email text as HTML representation.
   *
   * @protected
   */
  protected getHtmlRepresentation(): string {
    return (
      `
      <div>
        Hi ${this.calEvent.organizer.name},<br />
        <br />
        A new event has been scheduled.<br />
        <br />
        <strong>Event Type:</strong><br />
        ${this.calEvent.type}<br />
        <br />
        <strong>Invitee Email:</strong><br />
        <a href="mailto:${this.calEvent.attendees[0].email}">${this.calEvent.attendees[0].email}</a><br />
        <br />` +
      this.getAdditionalBody() +
      "<br />" +
      `<strong>Invitee Time Zone:</strong><br />
          ${this.calEvent.attendees[0].timeZone}<br />
          <br />
          <strong>Additional notes:</strong><br />
          ${this.calEvent.description}
        ` +
      this.getAdditionalFooter() +
      `
      </div>
    `
    );
  }

  /**
   * Adds the video call information to the mail body.
   *
   * @protected
   */
  protected getLocation(): string {
    if (this.additionInformation?.hangoutLink) {
      return `<strong>Location:</strong> <a href="${this.additionInformation?.hangoutLink}">${this.additionInformation?.hangoutLink}</a><br />`;
    }

    if (this.additionInformation?.entryPoints && this.additionInformation?.entryPoints.length > 0) {
      const locations = this.additionInformation?.entryPoints
        .map((entryPoint) => {
          return `
          Join by ${entryPoint.entryPointType}: <br />
          <a href="${entryPoint.uri}">${entryPoint.label}</a> <br />
        `;
        })
        .join("<br />");

      return `<strong>Locations:</strong><br /> ${locations}`;
    }

    return this.calEvent.location ? `<strong>Location:</strong> ${this.calEvent.location}<br /><br />` : "";
  }

  protected getAdditionalBody(): string {
    return `
      ${this.getLocation()}
    `;
  }
  /**
   * Returns the payload object for the nodemailer.
   *
   * @protected
   */
  protected getNodeMailerPayload(): Record<string, unknown> {
    const organizerStart: Dayjs = <Dayjs>dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);

    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      from: `Calendso <${this.getMailerOptions().from}>`,
      to: this.calEvent.organizer.email,
      subject: `New event: ${this.calEvent.attendees[0].name} - ${organizerStart.format("LT dddd, LL")} - ${
        this.calEvent.type
      }`,
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected printNodeMailerError(error: string): void {
    console.error("SEND_NEW_EVENT_NOTIFICATION_ERROR", this.calEvent.organizer.email, error);
  }
}
