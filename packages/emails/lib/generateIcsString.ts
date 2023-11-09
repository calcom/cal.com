import type { DateArray, ParticipationStatus, ParticipationRole, EventStatus } from "ics";
import { createEvent } from "ics";
import type { TFunction } from "next-i18next";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import { getWhen } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export enum BookingAction {
  Create = "create",
  Cancel = "cancel",
  Reschedule = "reschedule",
  RequestReschedule = "request_reschedule",
  LocationChange = "location_change",
}

const generateIcsString = ({
  event,
  title,
  subtitle,
  status,
  role,
  isRequestReschedule,
  t,
}: {
  event: CalendarEvent;
  title: string;
  subtitle: string;
  status: EventStatus;
  role: "attendee" | "organizer";
  isRequestReschedule?: boolean;
  t?: TFunction;
}) => {
  // Taking care of recurrence rule
  let recurrenceRule: string | undefined = undefined;
  const partstat: ParticipationStatus = "ACCEPTED";
  const icsRole: ParticipationRole = "REQ-PARTICIPANT";
  if (event.recurringEvent?.count) {
    // ics appends "RRULE:" already, so removing it from RRule generated string
    recurrenceRule = new RRule(event.recurringEvent).toString().replace("RRULE:", "");
  }

  const getTextBody = (title: string, subtitle: string): string => {
    let body: string;
    if (isRequestReschedule && role === "attendee" && t) {
      body = `
      ${title}
      ${getWhen(event, t)}
      ${subtitle}`;
    }
    body = `
    ${title}
    ${subtitle}

    ${getRichDescription(event, t)}
    `.trim();

    return body;
  };

  const icsEvent = createEvent({
    uid: event.iCalUID || event.uid!,
    sequence: event.iCalSequence || 0,
    start: dayjs(event.startTime)
      .utc()
      .toArray()
      .slice(0, 6)
      .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
    startInputType: "utc",
    productId: "calcom/ics",
    title: event.title,
    description: getTextBody(title, subtitle),
    duration: { minutes: dayjs(event.endTime).diff(dayjs(event.startTime), "minute") },
    organizer: { name: event.organizer.name, email: event.organizer.email },
    ...{ recurrenceRule },
    attendees: [
      ...event.attendees.map((attendee: Person) => ({
        name: attendee.name,
        email: attendee.email,
        partstat,
        role: icsRole,
        rsvp: true,
      })),
      ...(event.team?.members
        ? event.team?.members.map((member: Person) => ({
            name: member.name,
            email: member.email,
            partstat,
            role: icsRole,
            rsvp: true,
          }))
        : []),
    ],
    method: "REQUEST",
    status,
  });
  if (icsEvent.error) {
    throw icsEvent.error;
  }
  return icsEvent.value;
};

export default generateIcsString;
