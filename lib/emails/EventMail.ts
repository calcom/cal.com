import nodemailer from "nodemailer";

import { getErrorFromUnknown } from "@lib/errors";

import CalEventParser from "../CalEventParser";
import { CalendarEvent } from "../calendarClient";
import { serverConfig } from "../serverConfig";
import { stripHtml } from "./helpers";

export default abstract class EventMail {
  calEvent: CalendarEvent;
  parser: CalEventParser;

  /**
   * An EventMail always consists of a CalendarEvent
   * that stores the data of the event (like date, title, uid etc).
   *
   * @param calEvent
   */
  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
    this.parser = new CalEventParser(calEvent);
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
  public sendEmail() {
    new Promise((resolve, reject) =>
      nodemailer
        .createTransport(this.getMailerOptions().transport)
        .sendMail(this.getNodeMailerPayload(), (_err, info) => {
          if (_err) {
            const err = getErrorFromUnknown(_err);
            this.printNodeMailerError(err);
            reject(err);
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
  protected getMailerOptions() {
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
  protected abstract printNodeMailerError(error: Error): void;

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
}
