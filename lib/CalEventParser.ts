import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { getIntegrationName } from "@lib/integrations";
import { VideoCallData } from "@lib/videoClient";

import { CalendarEvent } from "./calendarClient";
import { stripHtml } from "./emails/helpers";

const translator = short();

export default class CalEventParser {
  protected calEvent: CalendarEvent;
  protected maybeUid?: string;
  protected optionalVideoCallData?: VideoCallData;

  constructor(calEvent: CalendarEvent, maybeUid?: string, optionalVideoCallData?: VideoCallData) {
    this.calEvent = calEvent;
    this.maybeUid = maybeUid;
    this.optionalVideoCallData = optionalVideoCallData;
  }

  /**
   * Returns a link to reschedule the given booking.
   */
  public getRescheduleLink(): string {
    return process.env.BASE_URL + "/reschedule/" + this.getUid();
  }

  /**
   * Returns a link to cancel the given booking.
   */
  public getCancelLink(): string {
    return process.env.BASE_URL + "/cancel/" + this.getUid();
  }

  /**
   * Returns a unique identifier for the given calendar event.
   */
  public getUid(): string {
    return this.maybeUid ?? translator.fromUUID(uuidv5(JSON.stringify(this.calEvent), uuidv5.URL));
  }

  /**
   * Returns a footer section with links to change the event (as HTML).
   */
  public getChangeEventFooterHtml(): string {
    return `<p style="color: #4b5563; margin-top: 20px;">Need to make a change? <a href="${this.getCancelLink()}" style="color: #161e2e;">Cancel</a> or <a href="${this.getRescheduleLink()}" style="color: #161e2e;">reschedule</a></p>`;
  }

  /**
   * Returns a footer section with links to change the event (as plain text).
   */
  public getChangeEventFooter(): string {
    return stripHtml(this.getChangeEventFooterHtml());
  }

  /**
   * Returns an extended description with all important information (as HTML).
   *
   * @protected
   */
  public getRichDescriptionHtml(): string {
    // This odd indentation is necessary because otherwise the leading tabs will be applied into the event description.
    return (
      `
<strong>Event Type:</strong><br />${this.calEvent.type}<br />
<strong>Invitee Email:</strong><br /><a href="mailto:${this.calEvent.attendees[0].email}">${this.calEvent.attendees[0].email}</a><br />
` +
      (this.getLocation()
        ? `<strong>Location:</strong><br />${this.getLocation()}<br />
`
        : "") +
      `<strong>Invitee Time Zone:</strong><br />${this.calEvent.attendees[0].timeZone}<br />
<strong>Additional notes:</strong><br />${this.getDescriptionText()}<br />` +
      this.getChangeEventFooterHtml()
    );
  }

  /**
   * Conditionally returns the event's location. When VideoCallData is set,
   * it returns the meeting url. Otherwise, the regular location is returned.
   *
   * @protected
   */
  protected getLocation(): string | undefined {
    if (this.optionalVideoCallData) {
      return this.optionalVideoCallData.url;
    }
    return this.calEvent.location;
  }

  /**
   * Returns the event's description text. If VideoCallData is set, it prepends
   * some video call information before the text as well.
   *
   * @protected
   */
  protected getDescriptionText(): string | undefined {
    if (this.optionalVideoCallData) {
      return `
${getIntegrationName(this.optionalVideoCallData.type)} meeting
ID: ${this.optionalVideoCallData.id}
Password: ${this.optionalVideoCallData.password}
${this.calEvent.description}`;
    }
    return this.calEvent.description;
  }

  /**
   * Returns an extended description with all important information (as plain text).
   *
   * @protected
   */
  public getRichDescription(): string {
    return stripHtml(this.getRichDescriptionHtml());
  }

  /**
   * Returns a calendar event with rich description.
   */
  public asRichEvent(): CalendarEvent {
    const eventCopy: CalendarEvent = { ...this.calEvent };
    eventCopy.description = this.getRichDescriptionHtml();
    eventCopy.location = this.getLocation();
    return eventCopy;
  }

  /**
   * Returns a calendar event with rich description as plain text.
   */
  public asRichEventPlain(): CalendarEvent {
    const eventCopy: CalendarEvent = { ...this.calEvent };
    eventCopy.description = this.getRichDescription();
    eventCopy.location = this.getLocation();
    return eventCopy;
  }
}
