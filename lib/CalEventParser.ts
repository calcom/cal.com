import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { getIntegrationName } from "@lib/integrations";

import { CalendarEvent } from "./calendarClient";
import { stripHtml } from "./emails/helpers";

const translator = short();

export default class CalEventParser {
  protected calEvent: CalendarEvent;

  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
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
    return this.calEvent.uid ?? translator.fromUUID(uuidv5(JSON.stringify(this.calEvent), uuidv5.URL));
  }

  /**
   * Returns a footer section with links to change the event (as HTML).
   */
  public getChangeEventFooterHtml(): string {
    return `<p style="color: #4b5563; margin-top: 20px;">${this.calEvent.language(
      "need_to_make_a_change"
    )} <a href="${this.getCancelLink()}" style="color: #161e2e;">${this.calEvent.language(
      "cancel"
    )}</a> ${this.calEvent
      .language("or")
      .toLowerCase()} <a href="${this.getRescheduleLink()}" style="color: #161e2e;">${this.calEvent.language(
      "reschedule"
    )}</a></p>`;
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
<strong>${this.calEvent.language("event_type")}:</strong><br />${this.calEvent.type}<br />
<strong>${this.calEvent.language("invitee_email")}:</strong><br /><a href="mailto:${
        this.calEvent.attendees[0].email
      }">${this.calEvent.attendees[0].email}</a><br />
` +
      (this.getLocation()
        ? `<strong>${this.calEvent.language("location")}:</strong><br />${this.getLocation()}<br />
`
        : "") +
      `<strong>${this.calEvent.language("invitee_timezone")}:</strong><br />${
        this.calEvent.attendees[0].timeZone
      }<br />
<strong>${this.calEvent.language("additional_notes")}:</strong><br />${this.getDescriptionText()}<br />` +
      this.getChangeEventFooterHtml()
    );
  }

  /**
   * Conditionally returns the event's location. When VideoCallData is set,
   * it returns the meeting url. Otherwise, the regular location is returned.
   * For Daily video calls returns the direct link
   * @protected
   */
  protected getLocation(): string | null | undefined {
    const isDaily = this.calEvent.location === "integrations:daily";
    if (this.calEvent.videoCallData) {
      return this.calEvent.videoCallData.url;
    }
    if (isDaily) {
      return process.env.BASE_URL + "/call/" + this.getUid();
    }
    return this.calEvent.location;
  }

  /**
   * Returns the event's description text. If VideoCallData is set, it prepends
   * some video call information before the text as well.
   *
   * @protected
   */
  protected getDescriptionText(): string | null | undefined {
    if (this.calEvent.videoCallData) {
      return `
${this.calEvent.language("integration_meeting_id", {
  integrationName: getIntegrationName(this.calEvent.videoCallData.type),
  meetingId: this.calEvent.videoCallData.id,
})}
${this.calEvent.language("password")}: ${this.calEvent.videoCallData.password}
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
