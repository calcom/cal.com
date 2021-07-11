import { CalendarEvent } from "./calendarClient";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";
import { stripHtml } from "./emails/helpers";
import dayjs, { Dayjs } from "dayjs";
import EventMail from "@lib/emails/EventMail";

const translator = short();

export default class CalEventParser {
  calEvent: CalendarEvent;

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
    return translator.fromUUID(uuidv5(JSON.stringify(this.calEvent), uuidv5.URL));
  }

  /**
   * Returns a footer section with links to change the event (as HTML).
   */
  public getChangeEventFooterHtml(): string {
    return `<br />
<strong>Need to change this event?</strong><br />
Cancel: <a href="${this.getCancelLink()}">${this.getCancelLink()}</a><br />
Reschedule: <a href="${this.getRescheduleLink()}">${this.getRescheduleLink()}</a>
    `;
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
      (this.calEvent.location
        ? `<strong>Location:</strong><br />${this.calEvent.location}<br />
`
        : "") +
      `<strong>Invitee Time Zone:</strong><br />${this.calEvent.attendees[0].timeZone}<br />
<strong>Additional notes:</strong><br />${this.calEvent.description}<br />` +
      this.getChangeEventFooterHtml()
    );
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
    return eventCopy;
  }

  public getInviteeStart(): Dayjs {
    return <Dayjs>dayjs(this.calEvent.startTime).tz(this.calEvent.attendees[0].timeZone);
  }

  public getInviteeEnd(): Dayjs {
    return <Dayjs>dayjs(this.calEvent.endTime).tz(this.calEvent.attendees[0].timeZone);
  }

  protected getLocation(): string {
    if (this.additionInformation?.hangoutLink) {
      return `<strong>Location:</strong> <a href="${this.additionInformation?.hangoutLink}">${this.additionInformation?.hangoutLink}</a><br />`;
    }

    if (this.additionInformation?.entryPoints && this.additionInformation?.entryPoints.length > 0) {
      const locations = this.additionInformation?.entryPoints
        .map((entryPoint) => {
          return `
          Join by ${entryPoint.entryPointType}: <br />
          <a href="${entryPoint.uri}">${entryPoint.label}</a> <br />
        `;
        })
        .join("<br />");

      return `<strong>Locations:</strong><br /> ${locations}`;
    }

    return this.calEvent.location ? `<strong>Location:</strong> ${this.calEvent.location}<br /><br />` : "";
  }
}

export interface EventPlaceholder {
  variable: string;
  label: string;
  getValue: (eventMail: EventMail) => string;
}

export const eventPlaceholders: EventPlaceholder[] = [
  {
    variable: "{AttendeeName}",
    label: "Attendee Name",
    getValue: (eventMail) => eventMail.parser.calEvent.attendees[0].name,
  },
  {
    variable: "{AttendeeTimezone}",
    label: "Attendee Timezone",
    getValue: (eventMail) => eventMail.parser.calEvent.attendees[0].timeZone,
  },
  {
    variable: "{YourName}",
    label: "Your Name",
    getValue: (eventMail) => eventMail.parser.calEvent.organizer.name,
  },
  { variable: "{EventName}", label: "Event Name", getValue: (eventParser) => eventParser.calEvent.type },
  {
    variable: "{EventDescription}",
    label: "Event Description",
    getValue: (eventMail) => eventMail.parser.calEvent.description,
  },
  {
    variable: "{EventLocation}",
    label: "Event Location",
    getValue: (eventMail) => eventMail.parser.calEvent.location,
  },
  {
    variable: "{EventLocationOptional}",
    label: "Optional Event Location",
    getValue: (eventMail) => eventMail.getLocation(),
  },
  {
    variable: "{EventDate}",
    label: "Event Date",
    getValue: (eventMail) => eventMail.parser.getInviteeStart().format("dddd, LL"),
  },
  {
    variable: "{EventStartTime}",
    label: "Event Start Time",
    getValue: (eventMail) => eventMail.parser.getInviteeStart().format("h:mma"),
  },
  {
    variable: "{EventEndTime}",
    label: "Event End Time",
    getValue: (eventMail) => eventMail.parser.getInviteeEnd().format("h:mma"),
  },
  {
    variable: "{EventRescheduleLink}",
    label: "Event Reschedule Link",
    getValue: (eventMail) => eventMail.parser.getRescheduleLink(),
  },
  {
    variable: "{EventCancellationLink}",
    label: "Event Cancellation Link",
    getValue: (eventMail) => eventMail.parser.getCancelLink(),
  },
];
