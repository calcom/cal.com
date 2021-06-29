import { CalendarEvent } from "./calendarClient";
import dayjs, { Dayjs } from "dayjs";

export function getEventName(name: string, eventTitle: string, eventNameTemplate?: string) {
  return eventNameTemplate ? eventNameTemplate.replace("{USER}", name) : eventTitle + " with " + name;
}

export interface EventPlaceholder {
  variable: string;
  label: string;
  getValue: (event: CalendarEvent, uid: string) => string;
}

function getInviteeStart(event: CalendarEvent): Dayjs {
  return <Dayjs>dayjs(event.startTime).tz(event.attendees[0].timeZone);
}

function getInviteeEnd(event: CalendarEvent): Dayjs {
  return <Dayjs>dayjs(event.endTime).tz(event.attendees[0].timeZone);
}

function getRescheduleLink(uid: string): string {
  return process.env.BASE_URL + "/reschedule/" + uid;
}

function getCancelLink(uid: string): string {
  return process.env.BASE_URL + "/cancel/" + uid;
}

export const eventPlaceholders: EventPlaceholder[] = [
  { variable: "{AttendeeName}", label: "Attendee Name", getValue: (event) => event.attendees[0].name },
  {
    variable: "{AttendeeTimezone}",
    label: "Attendee Timezone",
    getValue: (event) => event.attendees[0].timeZone,
  },
  { variable: "{YourName}", label: "Your Name", getValue: (event) => event.organizer.name },
  { variable: "{EventName}", label: "Event Name", getValue: (event) => event.type },
  { variable: "{EventDescription}", label: "Event Description", getValue: (event) => event.description },
  { variable: "{EventLocation}", label: "Event Location", getValue: (event) => event.location },
  {
    variable: "{EventLocationOptional}",
    label: "Optional Event Location",
    getValue: (event) => (event.location ? `<strong>Location:</strong> ${event.location}<br /><br />` : ""),
  },
  {
    variable: "{EventDate}",
    label: "Event Date",
    getValue: (event) => getInviteeStart(event).format("dddd, LL"),
  },
  {
    variable: "{EventStartTime}",
    label: "Event Start Time",
    getValue: (event) => getInviteeStart(event).format("h:mma"),
  },
  {
    variable: "{EventEndTime}",
    label: "Event End Time",
    getValue: (event) => getInviteeEnd(event).format("h:mma"),
  },
  {
    variable: "{EventRescheduleLink}",
    label: "Event Reschedule Link",
    getValue: (event, uid: string) => getRescheduleLink(uid),
  },
  {
    variable: "{EventCancellationLink}",
    label: "Event Cancellation Link",
    getValue: (event, uid: string) => getCancelLink(uid),
  },
];

export function getDefaultHTMLTemplate(): string {
  return `<div>
  Hi {AttendeeName},<br />
  <br />
  Your {EventName} with {YourName} at {EventStartTime} 
  ({AttendeeTimezone}) on {EventDate} is scheduled.<br />
  <br />
  {EventLocationOptional}
  <strong>Additional notes:</strong><br />
  {EventDescription}<br />
  <br/>
  <br/>
  <strong>Need to change this event?</strong><br/>
  Cancel: <a href="{EventCancellationLink}">{EventCancellationLink}</a><br />
  Reschedule: <a href="{EventRescheduleLink}">{EventRescheduleLink}</a>
</div>`;
}

export function getDefaultSubjectTemplate(): string {
  return "Confirmed: {EventName} with {YourName} on {EventDate}";
}
