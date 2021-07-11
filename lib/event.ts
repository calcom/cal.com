import { CalendarEvent } from "./calendarClient";

export function getEventName(name: string, eventTitle: string, eventNameTemplate?: string) {
  return eventNameTemplate ? eventNameTemplate.replace("{USER}", name) : eventTitle + " with " + name;
}

// TODO must match default email content EventAttendeeMail.getDefaultHtmlRepresentation
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
