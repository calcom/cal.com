import CalEventParser from "../CalEventParser";
import { stripHtml } from "./helpers";
import { CalendarEvent, ConferenceData } from "../calendarClient";
import { serverConfig } from "../serverConfig";
import nodemailer from "nodemailer";

interface EntryPoint {
  entryPointType?: string;
  uri?: string;
  label?: string;
  pin?: string;
  accessCode?: string;
  meetingCode?: string;
  passcode?: string;
  password?: string;
}

interface AdditionInformation {
  conferenceData?: ConferenceData;
  entryPoints?: EntryPoint[];
  hangoutLink?: string;
}

export default abstract class EventMail {
  calEvent: CalendarEvent;
  parser: CalEventParser;
  uid: string;
  additionInformation?: AdditionInformation;

  /**
   * An EventMail always consists of a CalendarEvent
   * that stores the very basic data of the event (like date, title etc).
   * It also needs the UID of the stored booking in our database.
   *
   * @param calEvent
   * @param uid
   */
  constructor(calEvent: CalendarEvent, uid: string, additionInformation: AdditionInformation = null) {
    this.calEvent = calEvent;
    this.uid = uid;
    this.parser = new CalEventParser(calEvent);
    this.additionInformation = additionInformation;
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
    return stripHtml(this.getHtmlRepresentation());
  }

  /**
   * Returns the payload object for the nodemailer.
   * @protected
   */
  protected abstract getNodeMailerPayload(): Record<string, unknown>;

  /**
   * Sends the email to the event attendant and returns a Promise.
   */
  public sendEmail(): Promise<any> {
    new Promise((resolve, reject) =>
      nodemailer
        .createTransport(this.getMailerOptions().transport)
        .sendMail(this.getNodeMailerPayload(), (error, info) => {
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

  protected abstract getLocation(): string;

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
    return this.parser.getRescheduleLink();
  }

  /**
   * Returns a link to cancel the given booking.
   *
   * @protected
   */
  protected getCancelLink(): string {
    return this.parser.getCancelLink();
  }

  /**
   * Defines a footer that will be appended to the email.
   * @protected
   */
  protected getAdditionalFooter(): string {
    return this.parser.getChangeEventFooterHtml();
  }
}
