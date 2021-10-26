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
        ${this.calEvent.language("hi_user_name", { userName: this.calEvent.organizer.name })},<br />
        <br />
        ${this.calEvent.language("event_has_been_rescheduled")}<br />
        <br />
        <strong>${this.calEvent.language("event_type")}:</strong><br />
        ${this.calEvent.type}<br />
        <br />
        <strong>${this.calEvent.language("invitee_email")}:</strong><br />
        <a href="mailto:${this.calEvent.attendees[0].email}">${this.calEvent.attendees[0].email}</a><br />
        <br />` +
      this.getAdditionalBody() +
      (this.calEvent.location
        ? `
            <strong>${this.calEvent.language("location")}:</strong><br />
            ${this.calEvent.location}<br />
            <br />
          `
        : "") +
      `<strong>${this.calEvent.language("invitee_timezone")}:</strong><br />
        ${this.calEvent.attendees[0].timeZone}<br />
        <br />
        <strong>${this.calEvent.language("additional_notes")}:</strong><br />
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
    const organizerStart: Dayjs = dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);

    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: this.calEvent.organizer.email,
      subject: this.calEvent.language("rescheduled_event_type_with_attendee", {
        attendeeName: this.calEvent.attendees[0].name,
        date: organizerStart.format("LT dddd, LL"),
        eventType: this.calEvent.type,
      }),
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected printNodeMailerError(error: Error): void {
    console.error("SEND_RESCHEDULE_EVENT_NOTIFICATION_ERROR", this.calEvent.organizer.email, error);
  }
}
