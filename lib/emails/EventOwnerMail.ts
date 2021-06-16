import {CalendarEvent} from "../calendarClient";
import {createEvent} from "ics";
import dayjs, {Dayjs} from "dayjs";
import {serverConfig} from "../serverConfig";
import nodemailer from 'nodemailer';

export default class EventOwnerMail {
  calEvent: CalendarEvent;

  /**
   * An EventOwnerMail always consists of a CalendarEvent
   * that stores the very basic data of the event (like date, title etc).
   *
   * @param calEvent
   */
  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
  }

  /**
   * Returns the instance's event as an iCal event in string representation.
   * @protected
   */
  protected getiCalEventAsString(): string {
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime).utc().toArray().slice(0, 6),
      startInputType: 'utc',
      productId: 'calendso/ics',
      title: `${this.calEvent.type} with ${this.calEvent.attendees[0].name}`,
      description: this.calEvent.description + this.stripHtml(this.getAdditionalBody()),
      duration: {minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), 'minute')},
      organizer: {name: this.calEvent.organizer.name, email: this.calEvent.organizer.email},
      attendees: this.calEvent.attendees.map((attendee: any) => ({name: attendee.name, email: attendee.email})),
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
    return `
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
        <br />` + this.getAdditionalBody() +
      (
        this.calEvent.location ? `
            <strong>Location:</strong><br />
            ${this.calEvent.location}<br />
            <br />
          ` : ''
      ) +
      `<strong>Invitee Time Zone:</strong><br />
        ${this.calEvent.attendees[0].timeZone}<br />
        <br />
        <strong>Additional notes:</strong><br />
        ${this.calEvent.description}
      </div>
    `;
  }

  /**
   * Returns the email text in a plain text representation
   * by stripping off the HTML tags.
   *
   * @protected
   */
  protected getPlainTextRepresentation(): string {
    return this.stripHtml(this.getHtmlRepresentation());
  }

  /**
   * Strips off all HTML tags and leaves plain text.
   *
   * @param html
   * @protected
   */
  protected stripHtml(html: string): string {
    return html
      .replace('<br />', "\n")
      .replace(/<[^>]+>/g, '');
  }

  /**
   * Sends the email to the event attendant and returns a Promise.
   */
  public sendEmail(): Promise<any> {
    const options = this.getMailerOptions();
    const {transport, from} = options;
    const organizerStart: Dayjs = <Dayjs>dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);

    return new Promise((resolve, reject) => nodemailer.createTransport(transport).sendMail(
      {
        icalEvent: {
          filename: 'event.ics',
          content: this.getiCalEventAsString(),
        },
        from: `Calendso <${from}>`,
        to: this.calEvent.organizer.email,
        subject: `New event: ${this.calEvent.attendees[0].name} - ${organizerStart.format('LT dddd, LL')} - ${this.calEvent.type}`,
        html: this.getHtmlRepresentation(),
        text: this.getPlainTextRepresentation(),
      },
      (error, info) => {
        if (error) {
          console.error("SEND_NEW_EVENT_NOTIFICATION_ERROR", this.calEvent.organizer.email, error);
          reject(new Error(error));
        } else {
          resolve(info);
        }
      }));
  }

  /**
   * Gathers the required provider information from the config.
   *
   * @protected
   */
  protected getMailerOptions(): any {
    return {
      transport: serverConfig.transport,
      from: serverConfig.from,
    };
  }

  /**
   * Can be used to include additional HTML or plain text
   * content into the mail body and calendar event description.
   * Leave it to an empty string if not desired.
   *
   * @protected
   */
  protected getAdditionalBody(): string {
    return "";
  }
}