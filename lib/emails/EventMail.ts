import {CalendarEvent} from "../calendarClient";
import {serverConfig} from "../serverConfig";
import nodemailer from 'nodemailer';

export default abstract class EventMail {
  calEvent: CalendarEvent;
  uid: string;

  /**
   * An EventMail always consists of a CalendarEvent
   * that stores the very basic data of the event (like date, title etc).
   * It also needs the UID of the stored booking in our database.
   *
   * @param calEvent
   * @param uid
   */
  constructor(calEvent: CalendarEvent, uid: string) {
    this.calEvent = calEvent;
    this.uid = uid;
  }

  /**
   * Returns the email text as HTML representation.
   *
   * @protected
   */
  protected abstract getHtmlRepresentation(): string;

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
   * Returns the payload object for the nodemailer.
   * @protected
   */
  protected abstract getNodeMailerPayload(): Object;

  /**
   * Sends the email to the event attendant and returns a Promise.
   */
  public sendEmail(): Promise<any> {
    new Promise((resolve, reject) => nodemailer.createTransport(this.getMailerOptions().transport).sendMail(
      this.getNodeMailerPayload(),
      (error, info) => {
        if (error) {
          this.printNodeMailerError(error);
          reject(new Error(error));
        } else {
          resolve(info);
        }
      })
    ).catch((e) => console.error("sendEmail", e));
    return new Promise((resolve) => resolve("send mail async"));
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
   * content into the mail body. Leave it to an empty
   * string if not desired.
   *
   * @protected
   */
  protected getAdditionalBody(): string {
    return "";
  }

  /**
   * Prints out the desired information when an error
   * occured while sending the mail.
   * @param error
   * @protected
   */
  protected abstract printNodeMailerError(error: string): void;

  /**
   * Returns a link to reschedule the given booking.
   *
   * @protected
   */
  protected getRescheduleLink(): string {
    return process.env.BASE_URL + '/reschedule/' + this.uid;
  }

  /**
   * Returns a link to cancel the given booking.
   *
   * @protected
   */
  protected getCancelLink(): string {
    return process.env.BASE_URL + '/cancel/' + this.uid;
  }


  /**
   * Defines a footer that will be appended to the email.
   * @protected
   */
  protected getAdditionalFooter(): string {
    return `
      <br/>
      <br/>
      <strong>Need to change this event?</strong><br />
      Cancel: <a href="${this.getCancelLink()}">${this.getCancelLink()}</a><br />
      Reschedule: <a href="${this.getRescheduleLink()}">${this.getRescheduleLink()}</a>
    `;
  }
}
