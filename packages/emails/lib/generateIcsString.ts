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
  t,
  role,
  bookingAction,
}: {
  event: CalendarEvent;
  t: TFunction;
  role: "attendee" | "organizer";
  bookingAction: BookingAction;
}) => {
  let title = "",
    subtitle = "",
    status: EventStatus;
  // Taking care of recurrence rule
  let recurrenceRule: string | undefined = undefined;
  const partstat: ParticipationStatus = "ACCEPTED";
  const icsRole: ParticipationRole = "REQ-PARTICIPANT";
  if (event.recurringEvent?.count) {
    // ics appends "RRULE:" already, so removing it from RRule generated string
    recurrenceRule = new RRule(event.recurringEvent).toString().replace("RRULE:", "");
  }

  switch (bookingAction) {
    case BookingAction.Create:
      if (role === "organizer") {
        title = event.recurringEvent?.count ? "new_event_scheduled_recurring" : "new_event_scheduled";
      } else if (role === "attendee") {
        title = event.recurringEvent?.count
          ? "your_event_has_been_scheduled_recurring"
          : "your_event_has_been_scheduled";
      }
      status = "CONFIRMED";
      break;
    case BookingAction.Cancel:
      title = "event_request_cancelled";
      status = "CANCELLED";
      break;
    case BookingAction.Reschedule:
      title = "event_has_been_rescheduled";
      status = "CONFIRMED";
      break;
    case BookingAction.RequestReschedule:
      if (role === "organizer") {
        title = t("request_reschedule_title_organizer", {
          attendee: event.attendees[0].name,
        });
        subtitle = t("request_reschedule_subtitle_organizer", {
          attendee: event.attendees[0].name,
        });
      } else if (role === "attendee") {
        title = "request_reschedule_booking";
        subtitle = t("request_reschedule_subtitle", {
          organizer: event.organizer.name,
        });
      }
      status = "CANCELLED";
  }

  const getTextBody = (title = "", subtitle = "emailed_you_and_any_other_attendees"): string => {
    let body: string;
    if (BookingAction.RequestReschedule && role === "attendee") {
      body = `
      ${t(title)}
      ${getWhen(event, t)}
      ${t(subtitle)}`;
    }
    body = `
    ${t(title)}
    ${t(subtitle)}

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
