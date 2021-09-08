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
      Hi ${this.calEvent.attendees[0].name},<br />
      <br />
      Your ${this.calEvent.type} with ${
        this.calEvent.team?.name || this.calEvent.organizer.name
      } has been rescheduled to ${this.getInviteeStart().format("h:mma")}
      (${this.calEvent.attendees[0].timeZone}) on ${this.getInviteeStart().format("dddd, LL")}.<br />
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
      subject: `Rescheduled: ${this.calEvent.type} with ${
        this.calEvent.organizer.name
      } on ${this.getInviteeStart().format("dddd, LL")}`,
      html: this.getHtmlRepresentation(),
      text: this.getPlainTextRepresentation(),
    };
  }

  protected printNodeMailerError(error: string): void {
    console.error("SEND_RESCHEDULE_CONFIRMATION_ERROR", this.calEvent.attendees[0].email, error);
  }
}
