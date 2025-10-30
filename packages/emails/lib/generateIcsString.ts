import type { DateArray, ParticipationRole, EventStatus, ParticipationStatus } from "ics";
import { createEvent } from "ics";
import type { TFunction } from "next-i18next";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export enum BookingAction {
  Create = "create",
  Cancel = "cancel",
  Reschedule = "reschedule",
  RequestReschedule = "request_reschedule",
  LocationChange = "location_change",
}

export type ICSCalendarEvent = Pick<
  CalendarEvent,
  | "uid"
  | "iCalUID"
  | "iCalSequence"
  | "startTime"
  | "endTime"
  | "title"
  | "organizer"
  | "attendees"
  | "location"
  | "recurringEvent"
  | "team"
  | "type"
  | "hideCalendarEventDetails"
>;

const generateIcsString = ({
  event,
  status,
  partstat = "ACCEPTED",
  t,
  isOrganizer = true,
}: {
  event: ICSCalendarEvent;
  status: EventStatus;
  partstat?: ParticipationStatus;
  t?: TFunction;
  isOrganizer?: boolean;
}) => {
  const location = getVideoCallUrlFromCalEvent(event) || event.location;

  // Taking care of recurrence rule
  let recurrenceRule: string | undefined = undefined;
  const icsRole: ParticipationRole = "REQ-PARTICIPANT";
  if (event.recurringEvent?.count) {
    // ics appends "RRULE:" already, so removing it from RRule generated string
    // Exclude exDates from RRule options as it's not a valid RRule property
    const { exDates, rDates, ...rruleOptions } = event.recurringEvent;
    recurrenceRule = new RRule(rruleOptions).toString().replace("RRULE:", "");
  }

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
    description: getRichDescription(event, t, false, true, isOrganizer),
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
    location: location ?? undefined,
    method: "REQUEST",
    status,
    ...(event.hideCalendarEventDetails ? { classification: "PRIVATE" } : {}),
  });
  if (icsEvent.error) {
    throw icsEvent.error;
  }

  let icsString = icsEvent.value;

  // Handle excluded dates (EXDATE) for cancelled recurring instances
  // This adds EXDATE properties to the ICS string for RFC 5545 compliance
  if (event.recurringEvent?.exDates && event.recurringEvent.exDates.length > 0) {
    // Remove duplicates from exDates array
    const uniqueExDates = [...new Set(event.recurringEvent.exDates)];

    // Format exDates as EXDATE property
    // EXDATE format: EXDATE:20251103T163000Z (UTC format)
    // Using UTC format for maximum compatibility across calendar clients
    const exDateStrings = uniqueExDates.map((dateValue) => {
      // Handle both Date objects and ISO date strings
      let date;
      if (dateValue instanceof Date) {
        date = dayjs(dateValue);
      } else if (typeof dateValue === "string") {
        date = dayjs(dateValue);
      } else {
        // If it's already a dayjs object or something else, try to convert it
        date = dayjs(dateValue);
      }

      // Convert to ICS datetime format (YYYYMMDDTHHMMSSZ)
      return `${date.utc().format("YYYYMMDDTHHmmss")}Z`;
    });

    // Create EXDATE lines - one line per date for better calendar client compatibility
    // Some clients have issues with comma-separated values in a single EXDATE line
    const exDateLines = exDateStrings.map((exDate) => `EXDATE:${exDate}`).join("\r\n");

    // Insert EXDATE after RRULE (or after DTSTART if RRULE doesn't exist)
    // This follows RFC 5545 recommendations for property ordering
    const rruleMatch = icsString.match(/RRULE:[^\r\n]+/);
    const dtStartMatch = icsString.match(/DTSTART[^\r\n]+/);

    if (rruleMatch && rruleMatch.index !== undefined) {
      // Insert after RRULE line
      const insertPosition = rruleMatch.index + rruleMatch[0].length;
      icsString = `${icsString.slice(0, insertPosition)}\r\n${exDateLines}${icsString.slice(insertPosition)}`;
    } else if (dtStartMatch && dtStartMatch.index !== undefined) {
      // Insert after DTSTART line (if no RRULE exists)
      const insertPosition = dtStartMatch.index + dtStartMatch[0].length;
      icsString = `${icsString.slice(0, insertPosition)}\r\n${exDateLines}${icsString.slice(insertPosition)}`;
    }
  }

  return icsString;
};

export default generateIcsString;
