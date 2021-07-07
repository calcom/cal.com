import dayjs, { Dayjs } from "dayjs";
import EventOrganizerMail from "./EventOrganizerMail";

export default class EventOrganizerRescheduledMail extends EventOrganizerMail {
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
        Your event has been rescheduled.<br />
        <br />
        <strong>Event Type:</strong><br />
        ${this.calEvent.type}<br />
        <br />
        <strong>Invitee Email:</strong><br />
        <a href="mailto:${this.calEvent.attendees[0].email}">${this.calEvent.attendees[0].email}</a><br />
        <br />` +
      this.getAdditionalBody() +
      (this.calEvent.location
        ? `
            <strong>Location:</strong><br />
            ${this.calEvent.location}<br />
            <br />
          `
        : "") +
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
      subject: `Rescheduled event: ${this.calEvent.attendees[0].name} - ${organizerStart.format(
        "LT dddd, LL"
      )} - ${this.calEvent.type}`,
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected printNodeMailerError(error: string): void {
    console.error("SEND_RESCHEDULE_EVENT_NOTIFICATION_ERROR", this.calEvent.organizer.email, error);
  }
}
