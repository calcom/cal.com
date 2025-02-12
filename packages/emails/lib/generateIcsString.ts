import type { DateArray, ParticipationRole, EventStatus, ParticipationStatus } from "ics";
import { createEvents } from "ics";
import type { TFunction } from "next-i18next";

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
}: {
  event: ICSCalendarEvent;
  status: EventStatus;
  partstat?: ParticipationStatus;
  t?: TFunction;
}) => {
  const icsRole: ParticipationRole = "REQ-PARTICIPANT";
  const events = event.recurringEvent.dates.map((recurrence, index) => {
    const location = recurrence.location || getVideoCallUrlFromCalEvent(event) || event.location;
    return {
      uid: `${event.iCalUID || event.uid}-${index + 1}`,
      sequence: event.iCalSequence || 0,
      start: dayjs(recurrence.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
      startInputType: "utc",
      productId: "calcom/ics",
      title: event.title,
      description: getRichDescription(event, t),
      duration: { minutes: dayjs(recurrence.endTime).diff(dayjs(recurrence.startTime), "minute") },
      organizer: { name: event.organizer.name, email: event.organizer.email },
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
    };
  });

  const { error, value } = createEvents(events);
  if (error) {
    throw error;
  }
  return value;
};

export default generateIcsString;
