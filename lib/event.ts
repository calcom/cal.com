import { CalendarEvent } from "./calendarClient";
import dayjs, { Dayjs } from "dayjs";

export function getEventName(name: string, eventTitle: string, eventNameTemplate?: string) {
  return eventNameTemplate ? eventNameTemplate.replace("{USER}", name) : eventTitle + " with " + name;
}

export interface EventPlaceholder {
  variable: string;
  label: string;
  getValue: (event: CalendarEvent) => string;
}

function getInviteeStart(event: CalendarEvent): Dayjs {
  return <Dayjs>dayjs(event.startTime).tz(event.attendees[0].timeZone);
}

function getInviteeEnd(event: CalendarEvent): Dayjs {
  return <Dayjs>dayjs(event.endTime).tz(event.attendees[0].timeZone);
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
  { variable: "{EventInputs}", label: "Event Inputs", getValue: (event) => "" },
  { variable: "{EventLocation}", label: "Event Location", getValue: (event) => "" },
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
  { variable: "{EventRescheduleLink}", label: "Event Reschedule Link", getValue: (event) => "" },
  { variable: "{EventCancellationLink}", label: "Event Cancellation Link", getValue: (event) => "" },
];
