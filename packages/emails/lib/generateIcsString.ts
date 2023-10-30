import type { DateArray } from "ics";
import { createEvent } from "ics";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

const generateIcsString = ({
  event,
  recipient,
  role,
}: {
  event: CalendarEvent;
  recipient: Person;
  role: "attendee" | "organizer";
}) => {
  const t = recipient.language.translate;
  // Taking care of recurrence rule
  let recurrenceRule: string | undefined = undefined;
  if (event.recurringEvent?.count) {
    // ics appends "RRULE:" already, so removing it from RRule generated string
    recurrenceRule = new RRule(event.recurringEvent).toString().replace("RRULE:", "");
  }

  const getTextBody = (title = "", subtitle = "emailed_you_and_any_other_attendees"): string => {
    if (!title) {
      if (role === "organizer") {
        title = event.recurringEvent?.count ? "new_event_scheduled_recurring" : "new_event_scheduled";
      }
      if (role === "attendee") {
        title = event.recurringEvent?.count
          ? "your_event_has_been_scheduled_recurring"
          : "your_event_has_been_scheduled";
      }
    }

    return `
${t(title)}
${t(subtitle)}

${getRichDescription(event, t)}
`.trim();
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
    description: getTextBody(),
    duration: { minutes: dayjs(event.endTime).diff(dayjs(event.startTime), "minute") },
    organizer: { name: event.organizer.name, email: event.organizer.email },
    ...{ recurrenceRule },
    attendees: [
      ...event.attendees.map((attendee: Person) => ({
        name: attendee.name,
        email: attendee.email,
      })),
      ...(event.team?.members
        ? event.team?.members.map((member: Person) => ({
            name: member.name,
            email: member.email,
          }))
        : []),
    ],
    status: "CONFIRMED",
  });
  if (icsEvent.error) {
    throw icsEvent.error;
  }
  return icsEvent.value;
};

export default generateIcsString;
