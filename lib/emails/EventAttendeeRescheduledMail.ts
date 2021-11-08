import EventAttendeeMail from "./EventAttendeeMail";

export default class EventAttendeeRescheduledMail extends EventAttendeeMail {
  /**
   * Returns the email text as HTML representation.
   *
   * @protected
   */
  protected getHtmlRepresentation(): string {
    return (
      `
    <div>
      ${this.calEvent.language("hi_user_name", { userName: this.calEvent.attendees[0].name })},<br />
      <br />
      ${this.calEvent.language("event_type_has_been_rescheduled_on_time_date", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        time: this.getInviteeStart().format("h:mma"),
        timeZone: this.calEvent.attendees[0].timeZone,
        date:
          `${this.calEvent.language(this.getInviteeStart().format("dddd, ").toLowerCase())}` +
          `${this.calEvent.language(this.getInviteeStart().format("LL").toLowerCase())}`,
      })}<br />
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
    return {
      to: `${this.calEvent.attendees[0].name} <${this.calEvent.attendees[0].email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: this.calEvent.language("rescheduled_event_type_with_organizer", {
        eventType: this.calEvent.type,
        organizerName: this.calEvent.organizer.name,
        date: this.getInviteeStart().format("dddd, LL"),
      }),
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected printNodeMailerError(error: Error): void {
    console.error("SEND_RESCHEDULE_CONFIRMATION_ERROR", this.calEvent.attendees[0].email, error);
  }
}
